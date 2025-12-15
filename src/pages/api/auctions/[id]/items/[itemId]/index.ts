import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  currencyCode: z.string().length(3).optional(),
  startingBid: z.number().min(0).optional(),
  minBidIncrement: z.number().min(0.01).optional(),
  bidderAnonymous: z.boolean().optional(),
  endDate: z.string().nullable().optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
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
    include: {
      auction: {
        select: {
          bidderVisibility: true,
        },
      },
    },
  });

  if (!membership) {
    return res.status(403).json({ message: "Not a member of this auction" });
  }

  if (req.method === "GET") {
    try {
      const item = await prisma.auctionItem.findUnique({
        where: { id: itemId },
        include: {
          currency: true,
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!item || item.auctionId !== auctionId) {
        return res.status(404).json({ message: "Item not found" });
      }

      // Get bids with user info - we'll filter based on visibility settings
      const bidsRaw = await prisma.bid.findMany({
        where: { auctionItemId: itemId },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { amount: "desc" },
      });

      // Check if item has ended and determine winner
      const isItemEnded = item.endDate && new Date(item.endDate) < new Date();
      const isItemOwner = item.creatorId === session.user.id;
      const highestBid = bidsRaw[0] || null;

      // Get winner email only if item ended and viewer is item owner
      let winnerEmail: string | null = null;
      if (isItemEnded && isItemOwner && highestBid) {
        const winner = await prisma.user.findUnique({
          where: { id: highestBid.userId },
          select: { email: true },
        });
        winnerEmail = winner?.email || null;
      }

      // Filter user info based on visibility settings (never include email)
      const bids = bidsRaw.map((bid) => {
        // Item owner always sees bidder names
        if (isItemOwner) {
          return { ...bid, isAnonymous: bid.isAnonymous };
        }

        // Always visible - show all bidders
        if (membership.auction.bidderVisibility === "VISIBLE") {
          return { ...bid, isAnonymous: false };
        }

        // Always anonymous - hide all bidders
        if (membership.auction.bidderVisibility === "ANONYMOUS") {
          return { ...bid, user: null, isAnonymous: true };
        }

        // PER_BID - respect each bid's isAnonymous setting
        if (bid.isAnonymous) {
          return { ...bid, user: null };
        }
        return bid;
      });

      return res.status(200).json({
        item: {
          ...item,
          endDate: item.endDate?.toISOString() || null,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        },
        bids: bids.map((b) => ({
          id: b.id,
          amount: b.amount,
          createdAt: b.createdAt.toISOString(),
          isAnonymous: b.isAnonymous,
          user: b.user,
        })),
        winnerEmail: winnerEmail,
      });
    } catch (error) {
      console.error("Get item error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // PATCH - Update item
  if (req.method === "PATCH") {
    // Get item and auction to check ownership and settings
    const item = await prisma.auctionItem.findUnique({
      where: { id: itemId },
      include: {
        _count: {
          select: { bids: true },
        },
        auction: {
          select: {
            endDate: true,
            itemEndMode: true,
          },
        },
      },
    });

    if (!item || item.auctionId !== auctionId) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Only item creator, OWNER, or ADMIN can edit
    const isCreator = item.creatorId === session.user.id;
    const isAdmin = ["OWNER", "ADMIN"].includes(membership.role);

    if (!isCreator && !isAdmin) {
      return res
        .status(403)
        .json({ message: "You don't have permission to edit this item" });
    }

    const parsed = updateItemSchema.safeParse(req.body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return res.status(400).json({
        message: Object.values(errors).flat()[0] || "Invalid input",
        errors,
      });
    }

    try {
      const hasBids = item._count.bids > 0;
      const updateData: Record<string, unknown> = {};

      // Always allowed updates
      if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
      if (parsed.data.description !== undefined)
        updateData.description = parsed.data.description;
      if (parsed.data.minBidIncrement !== undefined)
        updateData.minBidIncrement = parsed.data.minBidIncrement;
      if (parsed.data.bidderAnonymous !== undefined)
        updateData.bidderAnonymous = parsed.data.bidderAnonymous;

      // End date validation
      if (parsed.data.endDate !== undefined) {
        const newEndDate = parsed.data.endDate
          ? new Date(parsed.data.endDate)
          : null;
        const now = new Date();
        const isItemEnded = item.endDate && item.endDate < now;

        // Rule 1: If item already ended, cannot change end date to future
        if (isItemEnded && newEndDate && newEndDate > now) {
          return res.status(400).json({
            message:
              "Cannot extend end date for an item that has already ended",
          });
        }

        // Rule 2: Item end date cannot be after auction end date
        if (
          newEndDate &&
          item.auction.endDate &&
          newEndDate > item.auction.endDate
        ) {
          return res.status(400).json({
            message: "Item end date cannot be after the auction end date",
          });
        }

        // Rule 3: Can only set custom end date if itemEndMode is CUSTOM
        if (item.auction.itemEndMode !== "CUSTOM" && newEndDate !== null) {
          return res.status(400).json({
            message: "Custom item end dates are not allowed for this auction",
          });
        }

        updateData.endDate = newEndDate;
      }

      // Only allow these if no bids
      if (!hasBids) {
        if (parsed.data.currencyCode !== undefined)
          updateData.currencyCode = parsed.data.currencyCode;
        if (parsed.data.startingBid !== undefined)
          updateData.startingBid = parsed.data.startingBid;
      }

      const updated = await prisma.auctionItem.update({
        where: { id: itemId },
        data: updateData,
        include: {
          currency: true,
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return res.status(200).json({
        ...updated,
        endDate: updated.endDate?.toISOString() || null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Update item error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // DELETE - Delete item
  if (req.method === "DELETE") {
    // Get item to check ownership
    const item = await prisma.auctionItem.findUnique({
      where: { id: itemId },
      include: {
        _count: {
          select: { bids: true },
        },
      },
    });

    if (!item || item.auctionId !== auctionId) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Only item creator, OWNER, or ADMIN can delete
    const isCreator = item.creatorId === session.user.id;
    const isAdmin = ["OWNER", "ADMIN"].includes(membership.role);

    if (!isCreator && !isAdmin) {
      return res
        .status(403)
        .json({ message: "You don't have permission to delete this item" });
    }

    // Cannot delete items with bids
    if (item._count.bids > 0) {
      return res
        .status(400)
        .json({ message: "Cannot delete items that have bids" });
    }

    try {
      await prisma.auctionItem.delete({
        where: { id: itemId },
      });

      return res.status(200).json({ message: "Item deleted successfully" });
    } catch (error) {
      console.error("Delete item error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
