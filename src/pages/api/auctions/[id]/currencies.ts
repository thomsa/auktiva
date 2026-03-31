import {
  createHandler,
  withAuth,
  requireMembership,
  withValidation,
} from "@/lib/api";
import {
  auctionCurrencyHandlers,
  createAuctionCurrencySchema,
} from "@/lib/api/handlers";

export default createHandler({
  GET: [
    [withAuth, requireMembership],
    auctionCurrencyHandlers.listAuctionCurrencies,
  ],
  POST: [
    [withAuth, requireMembership, withValidation(createAuctionCurrencySchema)],
    auctionCurrencyHandlers.createAuctionCurrency,
  ],
});
