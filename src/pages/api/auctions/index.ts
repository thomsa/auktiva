import { createHandler, withAuth, withValidation } from "@/lib/api";
import { auctionHandlers, createAuctionSchema } from "@/lib/api/handlers";

export default createHandler({
  GET: [[withAuth], auctionHandlers.listAuctions],
  POST: [
    [withAuth, withValidation(createAuctionSchema)],
    auctionHandlers.createAuction,
  ],
});
