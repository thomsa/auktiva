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

export const deleteAccountSchema = z.object({
  password: z.string().optional(),
  confirmEmail: z.string().optional(),
  auctionTransfers: z
    .array(
      z.object({
        auctionId: z.string(),
        newOwnerEmail: z.string().email(),
      })
    )
    .optional(),
  deleteAuctions: z.array(z.string()).optional(),
});

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
export type UpdatePasswordBody = z.infer<typeof updatePasswordSchema>;
export type UpdateSettingsBody = z.infer<typeof updateSettingsSchema>;
export type DeleteAccountBody = z.infer<typeof deleteAccountSchema>;

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
    validatedBody
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
    validatedBody
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
    ctx.session!.user.id
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
    validatedBody
  );
  res.status(200).json(settings);
};

/**
 * GET /api/user/account - Get account info for deletion (owned auctions, has password, etc.)
 */
export const getAccountInfo: ApiHandler = async (_req, res, ctx) => {
  const userId = ctx.session!.user.id;
  const userEmail = ctx.session!.user.email;

  const [hasPassword, ownedAuctions] = await Promise.all([
    userService.userHasPassword(userId),
    userService.getUserOwnedAuctions(userId),
  ]);

  res.status(200).json({
    hasPassword,
    email: userEmail,
    ownedAuctions,
  });
};

/**
 * DELETE /api/user/account - Delete user account (GDPR compliant)
 */
export const deleteAccount: ApiHandler = async (req, res, ctx) => {
  const { validatedBody } = req as ValidatedRequest<DeleteAccountBody>;

  const result = await userService.deleteUserAccount(
    ctx.session!.user.id,
    ctx.session!.user.email,
    validatedBody
  );

  if (!result.success) {
    res.status(400).json({
      message: result.error,
      code: result.errorCode,
      ownedAuctions: result.ownedAuctions,
    });
    return;
  }

  res.status(200).json({ message: "Account deleted successfully" });
};
