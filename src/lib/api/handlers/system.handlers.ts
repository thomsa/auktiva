import { z } from "zod";
import type { ApiHandler } from "@/lib/api/types";
import * as systemService from "@/lib/services/system.service";
import { prisma } from "@/lib/prisma";

export const updateSystemSettingsSchema = z.object({
  deploymentAdminEmail: z.string().email().nullable().optional(),
  autoCheckUpdates: z.boolean().optional(),
});

export type UpdateSystemSettingsBody = z.infer<
  typeof updateSystemSettingsSchema
>;

/**
 * Get system settings
 * Only deployment admin can see full settings
 * Disabled on hosted deployments (Vercel/HOSTED=true)
 */
export const getSettings: ApiHandler = async (req, res, ctx) => {
  // Disable on hosted deployments
  const isHosted = !!process.env.VERCEL || process.env.HOSTED === "true";
  if (isHosted) {
    return res
      .status(403)
      .json({
        error:
          "Deployment administration is not available on hosted deployments",
      });
  }

  const userEmail = ctx.session?.user?.email;
  if (!userEmail) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const settings = await systemService.getSystemSettings();
  const isAdmin = await systemService.isDeploymentAdmin(userEmail);

  // Return full settings for admin, limited for others
  if (isAdmin) {
    return res.status(200).json({ ...settings, isDeploymentAdmin: true });
  }

  // Non-admins only see if updates are enabled and if they are the admin
  return res.status(200).json({
    autoCheckUpdates: settings.autoCheckUpdates,
    isDeploymentAdmin: false,
  });
};

/**
 * Update system settings
 * Only deployment admin can update (or first user to set admin)
 * Disabled on hosted deployments (Vercel/HOSTED=true)
 */
export const updateSettings: ApiHandler = async (req, res, ctx) => {
  // Disable on hosted deployments
  const isHosted = !!process.env.VERCEL || process.env.HOSTED === "true";
  if (isHosted) {
    return res
      .status(403)
      .json({
        error:
          "Deployment administration is not available on hosted deployments",
      });
  }

  const userEmail = ctx.session?.user?.email;
  if (!userEmail) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const settings = await systemService.getSystemSettings();
  const isAdmin = await systemService.isDeploymentAdmin(userEmail);

  // If no admin is set, allow the first user to claim it
  // Otherwise, only the current admin can update
  if (settings.deploymentAdminEmail && !isAdmin) {
    return res
      .status(403)
      .json({ error: "Only deployment admin can update system settings" });
  }

  const body = req.body as UpdateSystemSettingsBody;

  // If transferring admin rights to a new email, verify the user exists
  if (body.deploymentAdminEmail && body.deploymentAdminEmail !== userEmail) {
    const targetUser = await prisma.user.findUnique({
      where: { email: body.deploymentAdminEmail },
    });

    if (!targetUser) {
      return res.status(400).json({
        error: "User not found. The email must belong to a registered user.",
      });
    }
  }

  const updated = await systemService.updateSystemSettings(body);

  return res.status(200).json(updated);
};

/**
 * Check if current user is deployment admin
 */
export const checkAdminStatus: ApiHandler = async (req, res, ctx) => {
  const userEmail = ctx.session?.user?.email;
  if (!userEmail) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const isAdmin = await systemService.isDeploymentAdmin(userEmail);
  const settings = await systemService.getSystemSettings();

  return res.status(200).json({
    isDeploymentAdmin: isAdmin,
    hasDeploymentAdmin: !!settings.deploymentAdminEmail,
  });
};
