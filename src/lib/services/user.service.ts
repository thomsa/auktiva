import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { User, UserSettings } from "@/generated/prisma/client";
import * as systemService from "@/lib/services/system.service";

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

export interface DeleteAccountInput {
  password?: string; // Required for password-based accounts
  confirmEmail?: string; // Required for OAuth-only accounts
  auctionTransfers?: { auctionId: string; newOwnerEmail: string }[]; // Transfer ownership
  deleteAuctions?: string[]; // Auction IDs to delete
}

export interface DeleteAccountResult {
  success: boolean;
  error?: string;
  errorCode?:
    | "INVALID_PASSWORD"
    | "INVALID_EMAIL"
    | "IS_DEPLOYMENT_ADMIN"
    | "AUCTION_OWNERSHIP_REQUIRED"
    | "TRANSFER_EMAIL_NOT_FOUND"
    | "CANNOT_TRANSFER_TO_SELF";
  ownedAuctions?: { id: string; name: string }[];
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
 * Get user's connected OAuth accounts
 */
export async function getUserConnectedAccounts(
  userId: string
): Promise<{ provider: string; providerAccountId: string }[]> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { provider: true, providerAccountId: true },
  });

  return accounts;
}

/**
 * Check if user has a password set (for OAuth-only users)
 */
export async function userHasPassword(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  return !!user?.passwordHash;
}

/**
 * Get user profile
 */
export async function getUserProfile(
  userId: string
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
  userId: string
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
  userId: string
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
  input: UpdateProfileInput
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
  input: UpdatePasswordInput
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
    user.passwordHash
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
  input: UpdateSettingsInput
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

// ============================================================================
// Account Deletion (GDPR Compliant)
// ============================================================================

/**
 * Get auctions where user is the OWNER
 */
export async function getUserOwnedAuctions(
  userId: string
): Promise<{ id: string; name: string }[]> {
  const memberships = await prisma.auctionMember.findMany({
    where: {
      userId,
      role: "OWNER",
    },
    include: {
      auction: {
        select: { id: true, name: true },
      },
    },
  });

  return memberships.map((m) => ({
    id: m.auction.id,
    name: m.auction.name,
  }));
}

/**
 * Delete user account with GDPR compliance
 * - Validates identity (password or email confirmation)
 * - Checks deployment admin status
 * - Handles auction ownership transfers or deletions
 * - Cascades all user data deletion
 */
export async function deleteUserAccount(
  userId: string,
  userEmail: string,
  input: DeleteAccountInput
): Promise<DeleteAccountResult> {
  // 1. Check if user is deployment admin - must transfer first
  const isAdmin = await systemService.isDeploymentAdmin(userEmail);
  if (isAdmin) {
    return {
      success: false,
      error:
        "You must transfer deployment admin rights before deleting your account",
      errorCode: "IS_DEPLOYMENT_ADMIN",
    };
  }

  // 2. Get user and verify identity
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, passwordHash: true },
  });

  if (!user) {
    return { success: false, error: "User not found" };
  }

  // 3. Verify identity based on account type
  if (user.passwordHash) {
    // Password-based account: require password
    if (!input.password) {
      return {
        success: false,
        error: "Password is required to delete your account",
        errorCode: "INVALID_PASSWORD",
      };
    }
    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) {
      return {
        success: false,
        error: "Incorrect password",
        errorCode: "INVALID_PASSWORD",
      };
    }
  } else {
    // OAuth-only account: require email confirmation
    if (
      !input.confirmEmail ||
      input.confirmEmail.toLowerCase() !== user.email.toLowerCase()
    ) {
      return {
        success: false,
        error: "Please type your email address to confirm deletion",
        errorCode: "INVALID_EMAIL",
      };
    }
  }

  // 4. Check owned auctions
  const ownedAuctions = await getUserOwnedAuctions(userId);

  if (ownedAuctions.length > 0) {
    const transferIds = new Set(
      input.auctionTransfers?.map((t) => t.auctionId) || []
    );
    const deleteIds = new Set(input.deleteAuctions || []);

    // Check all owned auctions are accounted for
    const unhandledAuctions = ownedAuctions.filter(
      (a) => !transferIds.has(a.id) && !deleteIds.has(a.id)
    );

    if (unhandledAuctions.length > 0) {
      return {
        success: false,
        error: "You must transfer or delete all auctions you own",
        errorCode: "AUCTION_OWNERSHIP_REQUIRED",
        ownedAuctions: unhandledAuctions,
      };
    }

    // 5. Process transfers
    if (input.auctionTransfers && input.auctionTransfers.length > 0) {
      for (const transfer of input.auctionTransfers) {
        // Validate new owner exists
        const newOwner = await prisma.user.findUnique({
          where: { email: transfer.newOwnerEmail.toLowerCase() },
          select: { id: true, email: true },
        });

        if (!newOwner) {
          return {
            success: false,
            error: `User with email "${transfer.newOwnerEmail}" not found`,
            errorCode: "TRANSFER_EMAIL_NOT_FOUND",
          };
        }

        if (newOwner.id === userId) {
          return {
            success: false,
            error: "Cannot transfer auction ownership to yourself",
            errorCode: "CANNOT_TRANSFER_TO_SELF",
          };
        }

        // Check if new owner is already a member
        const existingMembership = await prisma.auctionMember.findUnique({
          where: {
            auctionId_userId: {
              auctionId: transfer.auctionId,
              userId: newOwner.id,
            },
          },
        });

        if (existingMembership) {
          // Update existing membership to OWNER
          await prisma.auctionMember.update({
            where: { id: existingMembership.id },
            data: { role: "OWNER" },
          });
        } else {
          // Create new OWNER membership
          await prisma.auctionMember.create({
            data: {
              auctionId: transfer.auctionId,
              userId: newOwner.id,
              role: "OWNER",
            },
          });
        }

        // Update auction creator
        await prisma.auction.update({
          where: { id: transfer.auctionId },
          data: { creatorId: newOwner.id },
        });
      }
    }

    // 6. Delete auctions marked for deletion (cascade will handle items, bids, etc.)
    if (input.deleteAuctions && input.deleteAuctions.length > 0) {
      await prisma.auction.deleteMany({
        where: {
          id: { in: input.deleteAuctions },
          creatorId: userId, // Safety: only delete if user is creator
        },
      });
    }
  }

  // 7. Delete the user (cascades to all related data)
  await prisma.user.delete({
    where: { id: userId },
  });

  return { success: true };
}
