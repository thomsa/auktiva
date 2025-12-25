import prisma from "@/lib/prisma";

export interface SystemSettings {
  deploymentAdminEmail: string | null;
  autoCheckUpdates: boolean;
}

/**
 * Get system settings (creates default if not exists)
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  let settings = await prisma.systemSettings.findUnique({
    where: { id: "system" },
  });

  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: { id: "system" },
    });
  }

  return {
    deploymentAdminEmail: settings.deploymentAdminEmail,
    autoCheckUpdates: settings.autoCheckUpdates,
  };
}

/**
 * Update system settings
 */
export async function updateSystemSettings(
  data: Partial<SystemSettings>
): Promise<SystemSettings> {
  const settings = await prisma.systemSettings.upsert({
    where: { id: "system" },
    create: {
      id: "system",
      ...data,
    },
    update: data,
  });

  return {
    deploymentAdminEmail: settings.deploymentAdminEmail,
    autoCheckUpdates: settings.autoCheckUpdates,
  };
}

/**
 * Check if a user is the deployment admin
 */
export async function isDeploymentAdmin(userEmail: string): Promise<boolean> {
  const settings = await getSystemSettings();
  return settings.deploymentAdminEmail === userEmail;
}
