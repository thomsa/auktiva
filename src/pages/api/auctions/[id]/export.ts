import {
  createHandler,
  withAuth,
  requireAdmin,
  NotFoundError,
} from "@/lib/api";
import type { ApiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { formatAuctionBidDisplay } from "@/lib/currency-display";

const exportAuction: ApiHandler = async (req, res, ctx) => {
  const auctionId = ctx.params.id;
  const format = (req.query.format as string) || "json";

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      items: {
        include: {
          currency: true,
          bids: {
            orderBy: { amount: "desc" },
            include: {
              currencyProfile: {
                select: {
                  id: true,
                  symbol: true,
                  inputMode: true,
                  fractionMode: true,
                  precision: true,
                  denominationConfig: true,
                },
              },
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  if (!auction) {
    throw new NotFoundError("Auction not found");
  }

  // Prepare export data
  const exportData = {
    auction: {
      id: auction.id,
      name: auction.name,
      description: auction.description,
      endDate: auction.endDate?.toISOString() || null,
      createdAt: auction.createdAt.toISOString(),
    },
    summary: {
      totalItems: auction.items.length,
      itemsWithBids: auction.items.filter((i) => i.bids.length > 0).length,
      totalBids: auction.items.reduce((sum, i) => sum + i.bids.length, 0),
      totalValue: auction.items.reduce(
        (sum, i) => sum + (i.currentBid || 0),
        0,
      ),
      memberCount: auction.members.length,
    },
    items: auction.items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      currency: item.currency.code,
      currencySymbol: item.currency.symbol,
      startingBid: item.startingBid,
      currentBid: item.currentBid,
      bidCount: item.bids.length,
      winner: item.bids[0]
        ? {
            name: item.bids[0].user.name,
            email: item.bids[0].user.email,
            amount: item.bids[0].amount,
            normalizedAmount: item.bids[0].normalizedAmount,
            displayRepresentation: formatAuctionBidDisplay({
              amount: item.bids[0].amount,
              enteredRepresentation: item.bids[0].enteredRepresentation,
              profile: item.bids[0].currencyProfile,
              fallbackSymbol: item.currency.symbol,
            }),
          }
        : null,
      endDate: item.endDate?.toISOString() || null,
    })),
    members: auction.members.map((m) => ({
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
    })),
  };

  if (format === "csv") {
    // Generate CSV for items
    const csvRows = [
      [
        "Item Name",
        "Currency",
        "Starting Bid",
        "Winning Bid",
        "Winning Bid Display",
        "Winning Bid Normalized",
        "Winner Name",
        "Winner Email",
        "Bid Count",
      ].join(","),
      ...exportData.items.map((item) =>
        [
          `"${item.name.replace(/"/g, '""')}"`,
          item.currency,
          item.startingBid,
          item.currentBid || 0,
          item.winner ? `"${item.winner.displayRepresentation}"` : "",
          item.winner?.normalizedAmount ?? "",
          item.winner
            ? `"${(item.winner.name || "").replace(/"/g, '""')}"`
            : "",
          item.winner ? `"${item.winner.email}"` : "",
          item.bidCount,
        ].join(","),
      ),
    ];

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${auction.name.replace(/[^a-z0-9]/gi, "_")}_export.csv"`,
    );
    res.status(200).send(csvRows.join("\n"));
    return;
  }

  // Default: JSON
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${auction.name.replace(/[^a-z0-9]/gi, "_")}_export.json"`,
  );
  res.status(200).json(exportData);
};

export default createHandler({
  GET: [[withAuth, requireAdmin], exportAuction],
});
