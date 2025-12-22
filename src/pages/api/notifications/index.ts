import { createHandler, withAuth } from "@/lib/api";
import { notificationHandlers } from "@/lib/api/handlers";

export default createHandler({
  GET: [[withAuth], notificationHandlers.listNotifications],
});
