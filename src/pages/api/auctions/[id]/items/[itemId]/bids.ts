import {
  createHandler,
  withAuth,
  requireMembership,
  withValidation,
  withBidRateLimit,
} from "@/lib/api";
import { bidHandlers, createBidSchema } from "@/lib/api/handlers";

export default createHandler({
  GET: [[withAuth, requireMembership], bidHandlers.listBids],
  POST: [
    [
      withAuth,
      withBidRateLimit,
      requireMembership,
      withValidation(createBidSchema),
    ],
    bidHandlers.placeBid,
  ],
});
