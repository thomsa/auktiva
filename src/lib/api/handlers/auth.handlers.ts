import { z } from "zod";
import { ApiHandler } from "../types";
import { BadRequestError, ValidationError } from "../errors";
import * as authService from "@/lib/services/auth.service";

// ============================================================================
// Schemas
// ============================================================================

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// ============================================================================
// Register
// ============================================================================

export const register: ApiHandler = async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    parsed.error.issues.forEach((issue) => {
      if (issue.path[0]) {
        const field = issue.path[0] as string;
        if (!errors[field]) errors[field] = [];
        errors[field].push(issue.message);
      }
    });
    throw new ValidationError("Validation failed", errors);
  }

  await authService.registerUser(parsed.data);

  // Always return success to prevent email enumeration attacks
  // If email exists, the service will send a "you already have an account" email
  // instead of revealing this information to potential attackers
  return res.status(201).json({
    message: "Registration successful. Please check your email.",
    emailSent: true,
  });
};

// ============================================================================
// Forgot Password
// ============================================================================

export const forgotPassword: ApiHandler = async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new BadRequestError("Email is required");
  }

  // Always return success to prevent email enumeration attacks
  await authService.requestPasswordReset(parsed.data.email);

  return res.status(200).json({
    message:
      "If an account with that email exists, we've sent a password reset link.",
  });
};

// ============================================================================
// Reset Password
// ============================================================================

export const resetPassword: ApiHandler = async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    parsed.error.issues.forEach((issue) => {
      if (issue.path[0]) {
        const field = issue.path[0] as string;
        if (!errors[field]) errors[field] = [];
        errors[field].push(issue.message);
      }
    });
    throw new ValidationError("Validation failed", errors);
  }

  const result = await authService.resetPassword(parsed.data);

  if (!result.success) {
    if (result.error === "invalid_token") {
      throw new BadRequestError(
        "Invalid or expired reset link. Please request a new password reset.",
      );
    }
    if (result.error === "expired_token") {
      throw new BadRequestError(
        "This reset link has expired. Please request a new password reset.",
      );
    }
  }

  return res.status(200).json({
    message:
      "Password reset successfully. You can now log in with your new password.",
  });
};

// ============================================================================
// reCAPTCHA Verification
// ============================================================================

export const verifyRecaptcha: ApiHandler = async (req, res) => {
  const { token } = req.body;
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // If reCAPTCHA is not configured, bypass verification
  if (!secretKey || !siteKey) {
    console.log("reCAPTCHA not configured, bypassing verification");
    return res.status(200).json({ success: true, message: "Bypassed" });
  }

  if (!token) {
    throw new BadRequestError("reCAPTCHA token not provided");
  }

  const response = await fetch(
    `https://www.google.com/recaptcha/api/siteverify`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `secret=${secretKey}&response=${token}`,
    },
  );

  const data = await response.json();

  if (data.success) {
    // For reCAPTCHA v3, check the score (v2 doesn't have score)
    const score = data.score;
    if (score !== undefined && score < 0.5) {
      throw new BadRequestError(
        "Verification failed. Please try again or contact support if the issue persists.",
      );
    }

    return res.status(200).json({
      success: true,
      message: "Verification successful",
      score,
    });
  } else {
    console.error("reCAPTCHA verification failed:", data["error-codes"]);
    throw new BadRequestError(
      "Verification failed. Please try again or contact support if the issue persists.",
    );
  }
};
