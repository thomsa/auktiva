import {
  createHandler,
  withAuth,
  requireMembership,
  withValidation,
} from "@/lib/api";
import {
  auctionCurrencyHandlers,
  updateAuctionCurrencySchema,
} from "@/lib/api/handlers";

export default createHandler({
  PATCH: [
    [withAuth, requireMembership, withValidation(updateAuctionCurrencySchema)],
    auctionCurrencyHandlers.updateAuctionCurrency,
  ],
  DELETE: [
    [withAuth, requireMembership],
    auctionCurrencyHandlers.archiveAuctionCurrency,
  ],
});
