import {
  createHandler,
  withAuth,
  requireAdmin,
  NotFoundError,
} from "@/lib/api";
import type { ApiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  auctionExportToCsv,
  buildAuctionExport,
} from "@/lib/auction-export";

const exportAuction: ApiHandler = async (req, res, ctx) => {
  const auctionId = ctx.params.id;
  const format = (req.query.format as string) || "json";

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      items: {
        // Drafts are not part of the results.
        where: { isPublished: true },
        orderBy: { createdAt: "asc" },
        include: {
          currency: true,
          images: {
            orderBy: { order: "asc" },
            take: 1,
          },
          bids: {
            orderBy: { amount: "desc" },
            take: 1,
            include: {
              currencyProfile: {
                select: {
                  id: true,
                  code: true,
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
          _count: {
            select: { bids: true },
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

  // Only admins reach this handler (requireAdmin); the results page's rules
  // for admins apply to winner names and emails.
  const exportData = buildAuctionExport({
    auction,
    items: auction.items,
    members: auction.members,
    viewerId: ctx.session!.user.id,
    isAdmin: true,
  });

  const fileBase = auction.name.replace(/[^a-z0-9]/gi, "_");

  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileBase}_export.csv"`,
    );
    res.status(200).send(auctionExportToCsv(exportData));
    return;
  }

  // Default: JSON
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${fileBase}_export.json"`,
  );
  res.status(200).json(exportData);
};

export default createHandler({
  GET: [[withAuth, requireAdmin], exportAuction],
});
