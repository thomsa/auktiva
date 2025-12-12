import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateAuctionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  joinMode: z.enum(["FREE", "INVITE_ONLY", "LINK"]).optional(),
  memberCanInvite: z.boolean().optional(),
  bidderVisibility: z.enum(["VISIBLE", "ANONYMOUS", "PER_BID"]).optional(),
  itemEndMode: z.enum(["AUCTION_END", "CUSTOM", "NONE"]).optional(),
  endDate: z.string().nullable().optional(),
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
      .json({ message: "Only the owner can modify this auction" });
  }

  // GET - Get auction details
  if (req.method === "GET") {
    try {
      const auction = await prisma.auction.findUnique({
        where: { id: auctionId },
        include: {
          _count: {
            select: { items: true, members: true },
          },
        },
      });

      if (!auction) {
        return res.status(404).json({ message: "Auction not found" });
      }

      return res.status(200).json({
        ...auction,
        endDate: auction.endDate?.toISOString() || null,
        createdAt: auction.createdAt.toISOString(),
        updatedAt: auction.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Get auction error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // PATCH - Update auction
  if (req.method === "PATCH") {
    const parsed = updateAuctionSchema.safeParse(req.body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return res.status(400).json({
        message: Object.values(errors).flat()[0] || "Invalid input",
        errors,
      });
    }

    try {
      // Check if open auctions are allowed
      const allowOpenAuctions = process.env.ALLOW_OPEN_AUCTIONS === "true";
      if (parsed.data.joinMode === "FREE" && !allowOpenAuctions) {
        return res.status(400).json({
          message: "Open auctions are not allowed on this server",
        });
      }

      const updateData: Record<string, unknown> = {};

      if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
      if (parsed.data.description !== undefined)
        updateData.description = parsed.data.description;
      if (parsed.data.joinMode !== undefined)
        updateData.joinMode = parsed.data.joinMode;
      if (parsed.data.memberCanInvite !== undefined)
        updateData.memberCanInvite = parsed.data.memberCanInvite;
      if (parsed.data.bidderVisibility !== undefined)
        updateData.bidderVisibility = parsed.data.bidderVisibility;
      if (parsed.data.itemEndMode !== undefined)
        updateData.itemEndMode = parsed.data.itemEndMode;
      if (parsed.data.endDate !== undefined) {
        updateData.endDate = parsed.data.endDate
          ? new Date(parsed.data.endDate)
          : null;
      }

      const auction = await prisma.auction.update({
        where: { id: auctionId },
        data: updateData,
      });

      return res.status(200).json({
        ...auction,
        endDate: auction.endDate?.toISOString() || null,
        createdAt: auction.createdAt.toISOString(),
        updatedAt: auction.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Update auction error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // DELETE - Delete auction
  if (req.method === "DELETE") {
    try {
      await prisma.auction.delete({
        where: { id: auctionId },
      });

      return res.status(200).json({ message: "Auction deleted successfully" });
    } catch (error) {
      console.error("Delete auction error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
