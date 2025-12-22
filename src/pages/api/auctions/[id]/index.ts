import {
  createHandler,
  withAuth,
  requireOwner,
  withValidation,
} from "@/lib/api";
import { auctionHandlers, updateAuctionSchema } from "@/lib/api/handlers";

export default createHandler({
  GET: [[withAuth, requireOwner], auctionHandlers.getAuction],
  PATCH: [
    [withAuth, requireOwner, withValidation(updateAuctionSchema)],
    auctionHandlers.updateAuction,
  ],
  DELETE: [[withAuth, requireOwner], auctionHandlers.deleteAuction],
});
