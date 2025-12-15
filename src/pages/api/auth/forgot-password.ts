import type { NextApiRequest, NextApiResponse } from "next";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/brevo";
import { getPasswordResetTemplateData } from "@/lib/email/templates";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 3;
const TOKEN_EXPIRY_MINUTES = 10;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Email is required" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Always return success to prevent email enumeration attacks
  const successResponse = {
    message:
      "If an account with that email exists, we've sent a password reset link.",
  };

  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Don't reveal that user doesn't exist
      return res.status(200).json(successResponse);
    }

    // Rate limiting: check how many tokens were created in the last hour
    const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const recentTokenCount = await prisma.passwordResetToken.count({
      where: {
        userId: user.id,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentTokenCount >= MAX_REQUESTS_PER_WINDOW) {
      // Don't reveal rate limiting to prevent enumeration
      console.log(
        `[Password Reset] Rate limit exceeded for user ${user.id} (${recentTokenCount} requests in last hour)`
      );
      return res.status(200).json(successResponse);
    }

    // Delete any existing tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate a secure random token
    const rawToken = randomBytes(32).toString("hex");
    const hashedToken = hashToken(rawToken);

    // Create token with 10-minute expiry
    await prisma.passwordResetToken.create({
      data: {
        token: hashedToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000),
      },
    });

    // Build reset URL
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.AUTH_URL ||
      "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    // Send email
    const templateData = getPasswordResetTemplateData({
      name: user.name || "there",
      resetUrl,
    });

    await sendEmail({
      to: user.email,
      toName: user.name || undefined,
      subject: "Reset Your Password - Auktiva",
      mjmlTemplate: templateData.template,
      replacements: templateData.replacements,
      type: "PASSWORD_RESET",
      metadata: { userId: user.id },
    });

    console.log(`[Password Reset] Email sent to ${user.email}`);

    return res.status(200).json(successResponse);
  } catch (error) {
    console.error("[Password Reset] Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
