import { createHandler, withAuth, requireOwner } from "@/lib/api";
import { auctionHandlers } from "@/lib/api/handlers";

export default createHandler({
  POST: [[withAuth, requireOwner], auctionHandlers.closeAuction],
});
