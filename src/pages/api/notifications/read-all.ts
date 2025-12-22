import { createHandler, withAuth } from "@/lib/api";
import { notificationHandlers } from "@/lib/api/handlers";

export default createHandler({
  POST: [[withAuth], notificationHandlers.markAllAsRead],
});
