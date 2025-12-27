import type { ApiHandler } from "@/lib/api/types";
import { NotFoundError, ForbiddenError } from "@/lib/api/errors";
import * as notificationService from "@/lib/services/notification.service";
import * as auctionEndService from "@/lib/services/auction-end.service";

// ============================================================================
// Handlers
// ============================================================================

/**
 * GET /api/notifications - List user notifications
 * Also processes ended items in the background (fire-and-forget)
 */
export const listNotifications: ApiHandler = async (req, res, ctx) => {
  const unreadOnly = req.query.unread === "true";
  const limit = req.query.limit
    ? parseInt(req.query.limit as string, 10)
    : undefined;

  // Process ended items in background (don't await, fire-and-forget)
  // This runs every time notifications are fetched (every 5-30s with smart polling)
  auctionEndService.processEndedItems().catch((err) => {
    console.error("Background auction-end processing failed:", err);
  });

  const notifications = await notificationService.getUserNotifications(
    ctx.session!.user.id,
    { unreadOnly, limit },
  );

  const unreadCount = await notificationService.getUnreadCount(
    ctx.session!.user.id,
  );

  res.status(200).json({
    notifications,
    unreadCount,
  });
};

/**
 * PATCH /api/notifications/[id] - Mark notification as read
 */
export const markNotificationAsRead: ApiHandler = async (_req, res, ctx) => {
  const notificationId = ctx.params.id;

  const notification =
    await notificationService.getNotificationById(notificationId);

  if (!notification) {
    throw new NotFoundError("Notification not found");
  }

  if (
    !notificationService.isNotificationOwner(notification, ctx.session!.user.id)
  ) {
    throw new ForbiddenError("Not authorized");
  }

  const updated = await notificationService.markAsRead(notificationId);

  res.status(200).json({
    id: updated.id,
    read: updated.read,
  });
};

/**
 * DELETE /api/notifications/[id] - Delete notification
 */
export const deleteNotification: ApiHandler = async (_req, res, ctx) => {
  const notificationId = ctx.params.id;

  const notification =
    await notificationService.getNotificationById(notificationId);

  if (!notification) {
    throw new NotFoundError("Notification not found");
  }

  if (
    !notificationService.isNotificationOwner(notification, ctx.session!.user.id)
  ) {
    throw new ForbiddenError("Not authorized");
  }

  await notificationService.deleteNotification(notificationId);

  res.status(200).json({ message: "Notification deleted" });
};

/**
 * POST /api/notifications/read-all - Mark all notifications as read
 */
export const markAllAsRead: ApiHandler = async (_req, res, ctx) => {
  const count = await notificationService.markAllAsRead(ctx.session!.user.id);

  res.status(200).json({
    message: "All notifications marked as read",
    count,
  });
};
