import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const auctionId = req.query.id as string;
  const format = (req.query.format as string) || "json";

  // Check membership (only admins can export)
  const membership = await prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId,
        userId: session.user.id,
      },
    },
  });

  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return res
      .status(403)
      .json({ message: "Only admins can export auction data" });
  }

  try {
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        items: {
          include: {
            currency: true,
            bids: {
              orderBy: { amount: "desc" },
              include: {
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
      return res.status(404).json({ message: "Auction not found" });
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
          "Winner Name",
          "Winner Email",
          "Bid Count",
        ].join(","),
        ...exportData.items.map((item) =>
          [
            `"${item.name.replace(/"/g, '""')}"`,
            item.currency,
            item.startingBid.toFixed(2),
            item.currentBid?.toFixed(2) || "0.00",
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
      return res.status(200).send(csvRows.join("\n"));
    }

    // Default: JSON
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${auction.name.replace(/[^a-z0-9]/gi, "_")}_export.json"`,
    );
    return res.status(200).json(exportData);
  } catch (error) {
    console.error("Export error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
