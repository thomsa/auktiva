import { prisma } from "@/lib/prisma";
import { randomBytes, createHash } from "crypto";
import { hash } from "bcryptjs";
import { eventBus } from "@/lib/events/event-bus";
import { sendEmail } from "@/lib/email/brevo";
import { getPasswordResetTemplateData } from "@/lib/email/templates";

// ============================================================================
// Types
// ============================================================================

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

// ============================================================================
// Constants
// ============================================================================

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 3;
const TOKEN_EXPIRY_MINUTES = 10;

// ============================================================================
// Helper Functions
// ============================================================================

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Find user by email
 */
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
}

/**
 * Check if email exists
 */
export async function emailExists(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  return !!user;
}

/**
 * Get password reset token
 */
export async function getPasswordResetToken(rawToken: string) {
  const hashedToken = hashToken(rawToken);
  return prisma.passwordResetToken.findUnique({
    where: { token: hashedToken },
    include: { user: true },
  });
}

// ============================================================================
// Mutation Functions
// ============================================================================

/**
 * Register a new user
 */
export async function registerUser(input: RegisterInput) {
  const { name, email, password } = input;
  const normalizedEmail = email.toLowerCase();

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    return { success: false, error: "email_exists" as const };
  }

  // Hash password and create user
  const passwordHash = await hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
    },
  });

  // Emit event for welcome email
  eventBus.emit("user.registered", {
    userId: user.id,
    email: user.email,
    name: user.name || "",
  });

  return { success: true, user };
}

/**
 * Request password reset - sends email if user exists
 * Returns success regardless of whether user exists (security)
 */
export async function requestPasswordReset(email: string): Promise<{
  success: boolean;
  rateLimited?: boolean;
}> {
  const normalizedEmail = email.toLowerCase().trim();

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    // Don't reveal that user doesn't exist
    return { success: true };
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
    console.log(
      `[Password Reset] Rate limit exceeded for user ${user.id} (${recentTokenCount} requests in last hour)`,
    );
    return { success: true, rateLimited: true };
  }

  // Delete any existing tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });

  // Generate a secure random token
  const rawToken = randomBytes(32).toString("hex");
  const hashedToken = hashToken(rawToken);

  // Create token with expiry
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

  return { success: true };
}

/**
 * Reset password with token
 */
export async function resetPassword(input: ResetPasswordInput): Promise<{
  success: boolean;
  error?: "invalid_token" | "expired_token";
}> {
  const { token, password } = input;

  // Hash the token to compare with stored hash
  const hashedToken = hashToken(token);

  // Find the token
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token: hashedToken },
    include: { user: true },
  });

  if (!resetToken) {
    return { success: false, error: "invalid_token" };
  }

  // Check if token is expired
  if (new Date() > resetToken.expiresAt) {
    // Delete expired token
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });

    return { success: false, error: "expired_token" };
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

  return { success: true };
}
