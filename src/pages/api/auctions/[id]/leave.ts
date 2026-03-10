import { createHandler, withAuth, requireMembership } from "@/lib/api";
import { memberHandlers } from "@/lib/api/handlers";

export default createHandler({
  GET: [[withAuth, requireMembership], memberHandlers.leaveAuctionPreflight],
  POST: [[withAuth, requireMembership], memberHandlers.leaveAuction],
});
