import { createHandler, withAuth } from "@/lib/api";
import { notificationHandlers } from "@/lib/api/handlers";

export default createHandler({
  PATCH: [[withAuth], notificationHandlers.markNotificationAsRead],
  DELETE: [[withAuth], notificationHandlers.deleteNotification],
});
