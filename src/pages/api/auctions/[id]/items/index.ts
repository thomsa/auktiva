import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { eventBus } from "@/lib/events/event-bus";
import "@/lib/email/handlers";
import { notifyNewItem } from "@/lib/notifications";

const createItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional(),
  currencyCode: z.string().min(1, "Currency is required"),
  startingBid: z.number().min(0).optional(),
  minBidIncrement: z.number().min(0.01).optional(),
  bidderAnonymous: z.boolean().optional(),
  endDate: z.string().optional(),
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
    // Only OWNER, ADMIN, or CREATOR can add items
    if (!["OWNER", "ADMIN", "CREATOR"].includes(membership.role)) {
      return res.status(403).json({ message: "Not authorized to add items" });
    }

    try {
      const parsed = createItemSchema.safeParse(req.body);

      if (!parsed.success) {
        const errors: Record<string, string> = {};
        parsed.error.issues.forEach((issue) => {
          if (issue.path[0]) {
            errors[issue.path[0] as string] = issue.message;
          }
        });
        return res.status(400).json({ errors });
      }

      const {
        name,
        description,
        currencyCode,
        startingBid,
        minBidIncrement,
        bidderAnonymous,
        endDate,
      } = parsed.data;

      // Verify currency exists
      const currency = await prisma.currency.findUnique({
        where: { code: currencyCode },
      });

      if (!currency) {
        return res
          .status(400)
          .json({ errors: { currencyCode: "Invalid currency" } });
      }

      // Get auction name for the event
      const auction = await prisma.auction.findUnique({
        where: { id: auctionId },
        select: { name: true },
      });

      // Create item
      const item = await prisma.auctionItem.create({
        data: {
          auctionId,
          name,
          description: description || null,
          currencyCode,
          startingBid: startingBid || 0,
          minBidIncrement: minBidIncrement || 1,
          bidderAnonymous: bidderAnonymous || false,
          endDate: endDate ? new Date(endDate) : null,
          creatorId: session.user.id,
        },
        include: {
          currency: true,
          creator: {
            select: { id: true, name: true, email: true },
          },
          images: {
            orderBy: { order: "asc" },
            take: 1,
            select: { url: true },
          },
          _count: {
            select: { bids: true },
          },
        },
      });

      // Get the first image URL if exists - construct full URL for emails
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL || "https://www.auktiva.org";
      const firstImageUrl =
        item.images.length > 0
          ? item.images[0].url.startsWith("http")
            ? item.images[0].url
            : `${appUrl}${item.images[0].url}`
          : null;

      // Emit event for new item notification emails
      eventBus.emit("item.created", {
        itemId: item.id,
        itemName: item.name,
        itemDescription: item.description,
        itemImageUrl: firstImageUrl,
        auctionId,
        auctionName: auction?.name || "Auction",
        creatorId: session.user.id,
      });

      // Send in-app notifications to all auction members (except creator)
      const members = await prisma.auctionMember.findMany({
        where: {
          auctionId,
          userId: { not: session.user.id },
        },
        select: { userId: true },
      });

      // Send notifications in background (don't await)
      Promise.all(
        members.map((member) =>
          notifyNewItem(
            member.userId,
            item.name,
            item.description,
            firstImageUrl,
            auctionId,
            item.id,
          ),
        ),
      ).catch((err) => console.error("Failed to send new item notifications:", err));

      return res.status(201).json(item);
    } catch (error) {
      console.error("Create item error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  if (req.method === "GET") {
    try {
      const items = await prisma.auctionItem.findMany({
        where: { auctionId },
        include: {
          currency: true,
          creator: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { bids: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return res.status(200).json(items);
    } catch (error) {
      console.error("Get items error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
