import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyOutbid } from "@/lib/notifications";
import { eventBus } from "@/lib/events/event-bus";
import "@/lib/email/handlers";

const createBidSchema = z.object({
  amount: z.number().positive("Bid amount must be positive"),
  isAnonymous: z.boolean().optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const auctionId = req.query.id as string;
  const itemId = req.query.itemId as string;

  // Check membership
  const membership = await prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    return res.status(403).json({ message: "Not a member of this auction" });
  }

  if (req.method === "POST") {
    try {
      const parsed = createBidSchema.safeParse(req.body);

      if (!parsed.success) {
        return res
          .status(400)
          .json({ message: parsed.error.issues[0].message });
      }

      const { amount, isAnonymous } = parsed.data;

      // Get item with auction info for visibility settings
      const item = await prisma.auctionItem.findUnique({
        where: { id: itemId },
        include: {
          currency: true,
          auction: {
            select: { bidderVisibility: true },
          },
        },
      });

      if (!item || item.auctionId !== auctionId) {
        return res.status(404).json({ message: "Item not found" });
      }

      // Check if user is the item creator
      if (item.creatorId === session.user.id) {
        return res
          .status(403)
          .json({ message: "You cannot bid on your own item" });
      }

      // Check if bidding has ended
      if (item.endDate && item.endDate < new Date()) {
        return res
          .status(400)
          .json({ message: "Bidding has ended for this item" });
      }

      // Calculate minimum bid
      const minBid = item.currentBid
        ? item.currentBid + item.minBidIncrement
        : item.startingBid;

      if (amount < minBid) {
        return res.status(400).json({
          message: `Minimum bid is ${minBid.toFixed(2)}`,
        });
      }

      // Store previous highest bidder for notification
      const previousBidderId = item.highestBidderId;

      // Determine if bid should be anonymous
      // Only use isAnonymous flag when auction is set to PER_BID mode
      const shouldBeAnonymous =
        item.auction.bidderVisibility === "PER_BID"
          ? (isAnonymous ?? false)
          : false;

      // Create bid and update item in transaction
      const [bid] = await prisma.$transaction([
        prisma.bid.create({
          data: {
            auctionItemId: itemId,
            userId: session.user.id,
            amount,
            isAnonymous: shouldBeAnonymous,
          },
        }),
        prisma.auctionItem.update({
          where: { id: itemId },
          data: {
            currentBid: amount,
            highestBidderId: session.user.id,
          },
        }),
      ]);

      // Notify previous bidder they've been outbid
      if (previousBidderId && previousBidderId !== session.user.id) {
        // In-app notification
        await notifyOutbid(
          previousBidderId,
          item.name,
          auctionId,
          itemId,
          amount,
          item.currency.symbol,
        );

        // Get previous bidder info for email
        const previousBidder = await prisma.user.findUnique({
          where: { id: previousBidderId },
          select: { email: true, name: true },
        });

        // Get auction name for email
        const auction = await prisma.auction.findUnique({
          where: { id: auctionId },
          select: { name: true },
        });

        if (previousBidder) {
          // Emit event for outbid email
          eventBus.emit("bid.outbid", {
            previousBidderId,
            previousBidderEmail: previousBidder.email,
            previousBidderName: previousBidder.name || "",
            itemId,
            itemName: item.name,
            auctionId,
            auctionName: auction?.name || "Auction",
            newAmount: amount,
            currencySymbol: item.currency.symbol,
          });
        }
      }

      return res.status(201).json(bid);
    } catch (error) {
      console.error("Create bid error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  if (req.method === "GET") {
    try {
      const bids = await prisma.bid.findMany({
        where: { auctionItemId: itemId },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { amount: "desc" },
      });

      return res.status(200).json(bids);
    } catch (error) {
      console.error("Get bids error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
