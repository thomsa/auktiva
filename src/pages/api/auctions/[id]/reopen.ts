import {
  createHandler,
  withAuth,
  requireOwner,
  withValidation,
} from "@/lib/api";
import { auctionHandlers, reopenSchema } from "@/lib/api/handlers";

export default createHandler({
  POST: [
    [withAuth, requireOwner, withValidation(reopenSchema)],
    auctionHandlers.reopenAuction,
  ],
});
