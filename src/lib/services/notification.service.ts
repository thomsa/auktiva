import { prisma } from "@/lib/prisma";
import { NotificationType } from "@/generated/prisma/client";
import type { Notification } from "@/generated/prisma/client";

// ============================================================================
// Types
// ============================================================================

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  imageUrl?: string;
  auctionId?: string;
  itemId?: string;
}

export interface NotificationForList {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  imageUrl: string | null;
  auctionId: string | null;
  itemId: string | null;
  read: boolean;
  createdAt: string;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  options?: { unreadOnly?: boolean; limit?: number },
): Promise<NotificationForList[]> {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(options?.unreadOnly && { read: false }),
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit,
  });

  return notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    imageUrl: n.imageUrl,
    auctionId: n.auctionId,
    itemId: n.itemId,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

/**
 * Get notification by ID
 */
export async function getNotificationById(
  notificationId: string,
): Promise<Notification | null> {
  return prisma.notification.findUnique({
    where: { id: notificationId },
  });
}

// ============================================================================
// Mutation Functions
// ============================================================================

/**
 * Create a notification
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<Notification> {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      imageUrl: input.imageUrl,
      auctionId: input.auctionId,
      itemId: input.itemId,
    },
  });
}

/**
 * Mark a notification as read
 */
export async function markAsRead(
  notificationId: string,
): Promise<Notification> {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  return result.count;
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string,
): Promise<void> {
  await prisma.notification.delete({
    where: { id: notificationId },
  });
}

// ============================================================================
// Notification Helper Functions
// ============================================================================

/**
 * Notify user they've been outbid
 */
export async function notifyOutbid(
  previousBidderId: string,
  itemName: string,
  auctionId: string,
  itemId: string,
  newAmount: number,
  currencySymbol: string,
): Promise<Notification> {
  return createNotification({
    userId: previousBidderId,
    type: "OUTBID",
    title: "You've been outbid!",
    message: `Someone placed a higher bid of ${currencySymbol}${newAmount.toFixed(2)} on "${itemName}"`,
    auctionId,
    itemId,
  });
}

/**
 * Notify user they won an auction
 */
export async function notifyAuctionWon(
  winnerId: string,
  itemName: string,
  auctionId: string,
  itemId: string,
  amount: number,
  currencySymbol: string,
): Promise<Notification> {
  return createNotification({
    userId: winnerId,
    type: "AUCTION_WON",
    title: "Congratulations! You won!",
    message: `You won "${itemName}" with a bid of ${currencySymbol}${amount.toFixed(2)}`,
    auctionId,
    itemId,
  });
}

/**
 * Notify auction owner that a member joined
 */
export async function notifyMemberJoined(
  ownerId: string,
  memberName: string,
  auctionName: string,
  auctionId: string,
): Promise<Notification> {
  return createNotification({
    userId: ownerId,
    type: "MEMBER_JOINED",
    title: "New member joined",
    message: `${memberName} joined your auction "${auctionName}"`,
    auctionId,
  });
}

/**
 * Notify user about a new item in an auction
 */
export async function notifyNewItem(
  userId: string,
  itemName: string,
  itemDescription: string | null,
  imageUrl: string | null,
  auctionId: string,
  itemId: string,
): Promise<Notification> {
  // Truncate description to 50 chars
  const truncatedDescription = itemDescription
    ? itemDescription.length > 50
      ? itemDescription.substring(0, 50) + "..."
      : itemDescription
    : "No description";

  return createNotification({
    userId,
    type: "NEW_ITEM",
    title: itemName,
    message: truncatedDescription,
    imageUrl: imageUrl || undefined,
    auctionId,
    itemId,
  });
}

// ============================================================================
// Permission Helpers
// ============================================================================

/**
 * Check if user owns a notification
 */
export function isNotificationOwner(
  notification: Notification,
  userId: string,
): boolean {
  return notification.userId === userId;
}
