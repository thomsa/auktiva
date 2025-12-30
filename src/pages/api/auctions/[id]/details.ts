import { createHandler, withAuth, withMembership } from "@/lib/api";
import type { ApiHandler } from "@/lib/api/types";
import * as auctionService from "@/lib/services/auction.service";
import * as itemService from "@/lib/services/item.service";

/**
 * GET /api/auctions/[id]/details - Get auction details with items for the detail page
 */
const getAuctionDetails: ApiHandler = async (_req, res, ctx) => {
  const auctionId = ctx.params.id;
  const userId = ctx.session!.user.id;

  // Get auction details
  const auction = await auctionService.getAuctionForDetailPage(auctionId);

  if (!auction) {
    return res.status(404).json({ message: "Auction not found" });
  }

  // Get items for list page
  const items = await itemService.getAuctionItemsForListPage(auctionId, userId);

  res.status(200).json({
    auction,
    items,
  });
};

export default createHandler({
  GET: [[withAuth, withMembership()], getAuctionDetails],
});
