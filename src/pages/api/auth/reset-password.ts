import type { NextApiRequest, NextApiResponse } from "next";
import { createHash } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const parsed = resetPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0] as string] = issue.message;
        }
      });
      return res.status(400).json({ errors });
    }

    const { token, password } = parsed.data;

    // Hash the token to compare with stored hash
    const hashedToken = hashToken(token);

    // Find the token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!resetToken) {
      return res.status(400).json({
        message:
          "Invalid or expired reset link. Please request a new password reset.",
      });
    }

    // Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      // Delete expired token
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });

      return res.status(400).json({
        message:
          "This reset link has expired. Please request a new password reset.",
      });
    }

    // Hash the new password
    const passwordHash = await hash(password, 12);

    // Update user password and delete the token in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      }),
    ]);

    console.log(
      `[Password Reset] Password updated for user ${resetToken.userId}`,
    );

    return res.status(200).json({
      message:
        "Password reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("[Password Reset] Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
