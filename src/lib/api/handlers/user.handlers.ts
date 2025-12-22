import type { ApiHandler } from "@/lib/api/types";
import type { ValidatedRequest } from "@/lib/api/middleware";
import { BadRequestError } from "@/lib/api/errors";
import * as userService from "@/lib/services/user.service";
import { z } from "zod";

// ============================================================================
// Schemas
// ============================================================================

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const updateSettingsSchema = z.object({
  emailOnNewItem: z.boolean().optional(),
  emailOnOutbid: z.boolean().optional(),
  itemSidebarCollapsed: z.boolean().optional(),
});

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
export type UpdatePasswordBody = z.infer<typeof updatePasswordSchema>;
export type UpdateSettingsBody = z.infer<typeof updateSettingsSchema>;

// ============================================================================
// Handlers
// ============================================================================

/**
 * GET /api/user/profile - Get user profile
 */
export const getProfile: ApiHandler = async (_req, res, ctx) => {
  const profile = await userService.getUserProfile(ctx.session!.user.id);
  res.status(200).json(profile);
};

/**
 * PATCH /api/user/profile - Update user profile
 */
export const updateProfile: ApiHandler = async (req, res, ctx) => {
  const { validatedBody } = req as ValidatedRequest<UpdateProfileBody>;
  const profile = await userService.updateUserProfile(
    ctx.session!.user.id,
    validatedBody,
  );
  res.status(200).json(profile);
};

/**
 * PATCH /api/user/password - Update user password
 */
export const updatePassword: ApiHandler = async (req, res, ctx) => {
  const { validatedBody } = req as ValidatedRequest<UpdatePasswordBody>;

  const result = await userService.updateUserPassword(
    ctx.session!.user.id,
    validatedBody,
  );

  if (!result.success) {
    throw new BadRequestError(result.error!);
  }

  res.status(200).json({ message: "Password updated successfully" });
};

/**
 * GET /api/user/settings - Get user settings
 */
export const getSettings: ApiHandler = async (_req, res, ctx) => {
  const settings = await userService.getUserSettingsWithDefaults(
    ctx.session!.user.id,
  );
  res.status(200).json(settings);
};

/**
 * PATCH /api/user/settings - Update user settings
 */
export const updateSettings: ApiHandler = async (req, res, ctx) => {
  const { validatedBody } = req as ValidatedRequest<UpdateSettingsBody>;
  const settings = await userService.updateUserSettings(
    ctx.session!.user.id,
    validatedBody,
  );
  res.status(200).json(settings);
};
