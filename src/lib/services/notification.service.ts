import { prisma } from "@/lib/prisma";
import { NotificationType } from "@/generated/prisma/client";
import type { Notification } from "@/generated/prisma/client";
import { publish, Events, Channels } from "@/lib/realtime";
import { formatAuctionAmount } from "@/lib/currency-display";
import { queueBiddingReopenedEmail } from "@/lib/email/service";
import { createLogger } from "@/lib/logger";
import type {
  NotificationNewEvent,
  NotificationCountEvent,
} from "@/lib/realtime/events";

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
  const notification = await prisma.notification.create({
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

  // Publish realtime event to user's private channel
  const notificationEvent: NotificationNewEvent = {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    imageUrl: notification.imageUrl,
    auctionId: notification.auctionId,
    itemId: notification.itemId,
    createdAt: notification.createdAt.toISOString(),
  };
  publish(
    Channels.privateUser(input.userId),
    Events.NOTIFICATION_NEW,
    notificationEvent,
  );

  // Also publish updated unread count
  const unreadCount = await getUnreadCount(input.userId);
  const countEvent: NotificationCountEvent = { unreadCount };
  publish(
    Channels.privateUser(input.userId),
    Events.NOTIFICATION_COUNT,
    countEvent,
  );

  return notification;
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
  normalizedAmount?: number,
): Promise<Notification> {
  const displayAmount = formatAuctionAmount(newAmount, {
    symbol: currencySymbol,
    precision: 2,
    fractionMode: "DECIMAL",
  });

  return createNotification({
    userId: previousBidderId,
    type: "OUTBID",
    title: "You've been outbid!",
    message: `Someone placed a higher bid of ${displayAmount} on "${itemName}"${
      typeof normalizedAmount === "number"
        ? ` (normalized: ${normalizedAmount})`
        : ""
    }`,
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
  normalizedAmount?: number,
): Promise<Notification> {
  const displayAmount = formatAuctionAmount(amount, {
    symbol: currencySymbol,
    precision: 2,
    fractionMode: "DECIMAL",
  });

  return createNotification({
    userId: winnerId,
    type: "AUCTION_WON",
    title: "Congratulations! You won!",
    message: `You won "${itemName}" with a bid of ${displayAmount}${
      typeof normalizedAmount === "number"
        ? ` (normalized: ${normalizedAmount})`
        : ""
    }`,
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
// Bidding Reopened
// ============================================================================

const reopenLogger = createLogger("bidding-reopened");

const UTC_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Formats a close time as `d MMM yyyy, HH:mm UTC` (e.g. "30 Nov 2026, 18:00
 * UTC"). Always UTC: the server does not know the recipient's time zone.
 */
export function formatReopenCloseTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCDate()} ${UTC_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}, ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

export interface BiddingReopenedMessageInput {
  auctionName: string;
  /** New auction close time, or null when the auction has no end time. */
  endDate: Date | null;
  /** Names of the reopened items the recipient bid on (at least one). */
  itemNames: string[];
  /** Names of those items the recipient was told they won. */
  wonItemNames?: string[];
}

/**
 * Builds the English title and message of a bidding-reopened notification.
 * Pure, so the wording can be tested without a database.
 */
export function buildBiddingReopenedMessage(
  input: BiddingReopenedMessageInput,
): { title: string; message: string } {
  const { auctionName, endDate, itemNames } = input;
  const wonItemNames = input.wonItemNames ?? [];
  const closeTime = endDate ? formatReopenCloseTime(endDate) : null;

  if (wonItemNames.length > 0) {
    const wins =
      wonItemNames.length === 1
        ? `your win on "${wonItemNames[0]}" is no longer final`
        : `your wins on ${wonItemNames.length} items are no longer final`;
    const pronoun = wonItemNames.length === 1 ? "it" : "they";
    const until = closeTime
      ? `${pronoun} can be outbid until ${closeTime}`
      : `${pronoun} can be outbid while bidding stays open (no end time)`;
    const otherCount = itemNames.length - wonItemNames.length;
    const others =
      otherCount > 0
        ? ` Bidding also reopened on ${otherCount} other ${otherCount === 1 ? "item" : "items"} you bid on.`
        : "";
    return {
      title: "Your win is no longer final",
      message: `Bidding reopened in "${auctionName}": ${wins} and ${until}.${others}`,
    };
  }

  const what =
    itemNames.length === 1 ? `"${itemNames[0]}"` : `${itemNames.length} items`;
  const close = closeTime
    ? `It now closes on ${closeTime}.`
    : "It has no end time.";
  return {
    title: "Bidding reopened",
    message: `Bidding reopened on ${what} in "${auctionName}". ${close}`,
  };
}

export interface NotifyBiddingReopenedInput {
  auctionId: string;
  auctionName: string;
  /** The user who reopened bidding; never notified about their own action. */
  actorId: string | null;
  endDate: Date | null;
  reopened: { id: string; name: string; winnerNotifiedUserId: string | null }[];
}

/**
 * Tells everyone who bid on the reopened items that bidding is open again:
 * one in-app notification per bidder, plus an e-mail for previously notified
 * winners who opted into item-won e-mails. Runs sequentially and returns the
 * number of users notified in-app.
 */
export async function notifyBiddingReopened(
  input: NotifyBiddingReopenedInput,
): Promise<number> {
  const { auctionId, auctionName, actorId, endDate, reopened } = input;
  if (reopened.length === 0) return 0;

  const bids = await prisma.bid.findMany({
    where: {
      auctionItemId: { in: reopened.map((item) => item.id) },
      ...(actorId ? { userId: { not: actorId } } : {}),
    },
    select: { userId: true, auctionItemId: true },
    distinct: ["userId", "auctionItemId"],
  });

  const itemIdsByUser = new Map<string, Set<string>>();
  for (const bid of bids) {
    const itemIds = itemIdsByUser.get(bid.userId) ?? new Set<string>();
    itemIds.add(bid.auctionItemId);
    itemIdsByUser.set(bid.userId, itemIds);
  }

  const recipientIds = [...itemIdsByUser.keys()].sort();
  const winnerIds = recipientIds.filter((userId) =>
    reopened.some((item) => item.winnerNotifiedUserId === userId),
  );
  const winners =
    winnerIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: winnerIds } },
          select: { id: true, email: true, name: true },
        })
      : [];
  const winnersById = new Map(winners.map((user) => [user.id, user]));

  let notified = 0;
  for (const userId of recipientIds) {
    // Keep reopened order so names appear the way the owner listed them.
    const items = reopened.filter((item) =>
      itemIdsByUser.get(userId)!.has(item.id),
    );
    const wonItems = items.filter(
      (item) => item.winnerNotifiedUserId === userId,
    );
    const { title, message } = buildBiddingReopenedMessage({
      auctionName,
      endDate,
      itemNames: items.map((item) => item.name),
      wonItemNames: wonItems.map((item) => item.name),
    });

    try {
      await createNotification({
        userId,
        type: "BIDDING_REOPENED",
        title,
        message,
        auctionId,
        itemId: items.length === 1 ? items[0].id : undefined,
      });
      notified++;
    } catch (err) {
      reopenLogger.error(
        { err, auctionId, userId },
        "Failed to create bidding-reopened notification",
      );
    }

    const winner = winnersById.get(userId);
    if (winner && wonItems.length > 0) {
      await queueBiddingReopenedEmail({
        userId,
        email: winner.email,
        name: winner.name,
        auctionId,
        auctionName,
        items: wonItems.map((item) => ({ id: item.id, name: item.name })),
        closeTime: endDate ? formatReopenCloseTime(endDate) : null,
      });
    }
  }

  reopenLogger.info(
    {
      auctionId,
      reopenedItems: reopened.length,
      recipients: recipientIds.length,
      notified,
    },
    "Sent bidding-reopened notifications",
  );

  return notified;
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
