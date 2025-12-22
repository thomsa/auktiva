import { createHandler, withAuth } from "@/lib/api";
import { inviteHandlers } from "@/lib/api/handlers";

export default createHandler({
  GET: inviteHandlers.getInvite, // Public - no auth required
  POST: [[withAuth], inviteHandlers.acceptInvite],
});
