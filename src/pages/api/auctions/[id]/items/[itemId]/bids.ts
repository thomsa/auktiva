import {
  createHandler,
  withAuth,
  requireMembership,
  withValidation,
} from "@/lib/api";
import { bidHandlers, createBidSchema } from "@/lib/api/handlers";

export default createHandler({
  GET: [[withAuth, requireMembership], bidHandlers.listBids],
  POST: [
    [withAuth, requireMembership, withValidation(createBidSchema)],
    bidHandlers.placeBid,
  ],
});
