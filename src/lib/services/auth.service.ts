import { prisma } from "@/lib/prisma";
import { randomBytes, createHash } from "crypto";
import { hash } from "bcryptjs";
import { sendEmail } from "@/lib/email";
import {
  getPasswordResetTemplateData,
  getAccountExistsTemplateData,
  getEmailVerificationTemplateData,
} from "@/lib/email/templates";

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
const PASSWORD_RESET_TOKEN_EXPIRY_MINUTES = 10;
const EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

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
 * To prevent email enumeration attacks, this function always succeeds.
 * If the email already exists, we send an "account exists" email instead.
 */
export async function registerUser(input: RegisterInput) {
  const { name, email, password } = input;
  const normalizedEmail = email.toLowerCase();

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    // Send "account already exists" email instead of revealing this to the API caller
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.AUTH_URL ||
      "http://localhost:3000";

    const templateData = getAccountExistsTemplateData({
      name: existingUser.name || "there",
      appUrl,
    });

    await sendEmail({
      to: existingUser.email,
      toName: existingUser.name || undefined,
      subject: "Account Already Exists - Auktiva",
      mjmlTemplate: templateData.template,
      replacements: templateData.replacements,
      type: "ACCOUNT_EXISTS",
      metadata: { userId: existingUser.id },
    });

    // Return success to prevent email enumeration
    return { success: true, emailSent: true, isExistingUser: true };
  }

  // Hash password and create user (emailVerified = null until verified)
  const passwordHash = await hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
    },
  });

  // Send email verification email instead of welcome email
  // Welcome email will be sent after verification
  await sendEmailVerification(user.id, user.email, user.name || "");

  return { success: true, user, emailSent: true };
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
      expiresAt: new Date(
        Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000,
      ),
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

// ============================================================================
// Email Verification Functions
// ============================================================================

/**
 * Send email verification email to a user
 * Used during registration and for resending verification
 */
export async function sendEmailVerification(
  userId: string,
  email: string,
  name: string,
): Promise<{ success: boolean; rateLimited?: boolean }> {
  // Rate limiting: check how many tokens were created in the last hour
  const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recentTokenCount = await prisma.emailVerificationToken.count({
    where: {
      userId,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (recentTokenCount >= MAX_REQUESTS_PER_WINDOW) {
    console.log(
      `[Email Verification] Rate limit exceeded for user ${userId} (${recentTokenCount} requests in last hour)`,
    );
    return { success: false, rateLimited: true };
  }

  // Delete any existing tokens for this user
  await prisma.emailVerificationToken.deleteMany({
    where: { userId },
  });

  // Generate a secure random token
  const rawToken = randomBytes(32).toString("hex");
  const hashedToken = hashToken(rawToken);

  // Create token with 24 hour expiry
  await prisma.emailVerificationToken.create({
    data: {
      token: hashedToken,
      userId,
      expiresAt: new Date(
        Date.now() + EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
      ),
    },
  });

  // Build verification URL
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL ||
    "http://localhost:3000";
  const verificationUrl = `${appUrl}/verify-email?token=${rawToken}`;

  // Send email
  const templateData = getEmailVerificationTemplateData({
    name: name || "there",
    verificationUrl,
  });

  await sendEmail({
    to: email,
    toName: name || undefined,
    subject: "Verify Your Email - Auktiva",
    mjmlTemplate: templateData.template,
    replacements: templateData.replacements,
    type: "EMAIL_VERIFICATION",
    metadata: { userId },
  });

  console.log(`[Email Verification] Email sent to ${email}`);

  return { success: true };
}

/**
 * Verify email with token
 */
export async function verifyEmail(rawToken: string): Promise<{
  success: boolean;
  error?: "invalid_token" | "expired_token";
  userId?: string;
}> {
  // Hash the token to compare with stored hash
  const hashedToken = hashToken(rawToken);

  // Find the token
  const verificationToken = await prisma.emailVerificationToken.findUnique({
    where: { token: hashedToken },
    include: { user: true },
  });

  if (!verificationToken) {
    return { success: false, error: "invalid_token" };
  }

  // Check if token is expired
  if (new Date() > verificationToken.expiresAt) {
    // Delete expired token
    await prisma.emailVerificationToken.delete({
      where: { id: verificationToken.id },
    });

    return { success: false, error: "expired_token" };
  }

  // Update user emailVerified and delete the token in a transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.delete({
      where: { id: verificationToken.id },
    }),
  ]);

  console.log(
    `[Email Verification] Email verified for user ${verificationToken.userId}`,
  );

  return { success: true, userId: verificationToken.userId };
}

/**
 * Resend verification email
 * Returns success regardless of whether user exists (security)
 */
export async function resendVerificationEmail(email: string): Promise<{
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

  // If user is already verified, don't send email but return success
  if (user.emailVerified) {
    return { success: true };
  }

  // Send verification email (includes rate limiting)
  return sendEmailVerification(user.id, user.email, user.name || "");
}

/**
 * Check if a user's email is verified
 */
export async function isEmailVerified(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { emailVerified: true },
  });

  return !!user?.emailVerified;
}
