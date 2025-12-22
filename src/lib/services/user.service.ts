import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { User, UserSettings } from "@/generated/prisma/client";

// ============================================================================
// Types
// ============================================================================

export interface UserProfile {
  id: string;
  name: string | null;
  email: string;
}

export interface UpdateProfileInput {
  name?: string;
}

export interface UpdatePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateSettingsInput {
  emailOnNewItem?: boolean;
  emailOnOutbid?: boolean;
  itemSidebarCollapsed?: boolean;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id: userId },
  });
}

/**
 * Get user profile
 */
export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  return user;
}

/**
 * Get user settings
 */
export async function getUserSettings(
  userId: string,
): Promise<UserSettings | null> {
  return prisma.userSettings.findUnique({
    where: { userId },
  });
}

/**
 * Get user settings with defaults
 */
export async function getUserSettingsWithDefaults(userId: string): Promise<{
  emailOnNewItem: boolean;
  emailOnOutbid: boolean;
  itemSidebarCollapsed: boolean;
}> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  return {
    emailOnNewItem: settings?.emailOnNewItem ?? false,
    emailOnOutbid: settings?.emailOnOutbid ?? false,
    itemSidebarCollapsed: settings?.itemSidebarCollapsed ?? false,
  };
}

/**
 * Get or create user settings
 */
export async function getOrCreateUserSettings(
  userId: string,
): Promise<UserSettings> {
  let settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    settings = await prisma.userSettings.create({
      data: { userId },
    });
  }

  return settings;
}

// ============================================================================
// Mutation Functions
// ============================================================================

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<UserProfile> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
    },
    select: { id: true, name: true, email: true },
  });

  return user;
}

/**
 * Update user password
 */
export async function updateUserPassword(
  userId: string,
  input: UpdatePasswordInput,
): Promise<{ success: boolean; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user?.passwordHash) {
    return {
      success: false,
      error: "Cannot change password for OAuth accounts",
    };
  }

  const isValid = await bcrypt.compare(
    input.currentPassword,
    user.passwordHash,
  );
  if (!isValid) {
    return { success: false, error: "Current password is incorrect" };
  }

  const hashedPassword = await bcrypt.hash(input.newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashedPassword },
  });

  return { success: true };
}

/**
 * Update user settings
 */
export async function updateUserSettings(
  userId: string,
  input: UpdateSettingsInput,
): Promise<UserSettings> {
  return prisma.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      emailOnNewItem: input.emailOnNewItem ?? false,
      emailOnOutbid: input.emailOnOutbid ?? false,
      itemSidebarCollapsed: input.itemSidebarCollapsed ?? false,
    },
    update: {
      ...(input.emailOnNewItem !== undefined && {
        emailOnNewItem: input.emailOnNewItem,
      }),
      ...(input.emailOnOutbid !== undefined && {
        emailOnOutbid: input.emailOnOutbid,
      }),
      ...(input.itemSidebarCollapsed !== undefined && {
        itemSidebarCollapsed: input.itemSidebarCollapsed,
      }),
    },
  });
}
