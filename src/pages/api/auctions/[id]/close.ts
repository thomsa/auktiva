import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const auctionId = req.query.id as string;

  // Check if user is owner
  const membership = await prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId,
        userId: session.user.id,
      },
    },
  });

  if (!membership || membership.role !== "OWNER") {
    return res
      .status(403)
      .json({ message: "Only the owner can close the auction" });
  }

  try {
    // Get all items with their highest bids
    const items = await prisma.auctionItem.findMany({
      where: { auctionId },
      include: {
        bids: {
          orderBy: { amount: "desc" },
          take: 1,
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    // Close the auction by setting end date to now
    const auction = await prisma.auction.update({
      where: { id: auctionId },
      data: {
        endDate: new Date(),
      },
    });

    // Close all items that haven't ended yet (no end date or end date in the future)
    const now = new Date();
    await prisma.auctionItem.updateMany({
      where: {
        auctionId,
        OR: [{ endDate: null }, { endDate: { gt: now } }],
      },
      data: {
        endDate: now,
      },
    });

    // Prepare winners summary
    const winners = items
      .filter((item) => item.bids.length > 0)
      .map((item) => ({
        itemId: item.id,
        itemName: item.name,
        winningBid: item.bids[0].amount,
        winner: item.bids[0].user,
        currencyCode: item.currencyCode,
      }));

    return res.status(200).json({
      message: "Auction closed successfully",
      auction: {
        id: auction.id,
        name: auction.name,
        endDate: auction.endDate?.toISOString(),
      },
      winners,
      totalItems: items.length,
      itemsWithBids: winners.length,
    });
  } catch (error) {
    console.error("Close auction error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
