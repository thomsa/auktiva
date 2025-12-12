import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createAuctionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  joinMode: z.enum(["FREE", "INVITE_ONLY", "LINK"]).optional(),
  memberCanInvite: z.boolean().optional(),
  bidderVisibility: z.enum(["VISIBLE", "ANONYMOUS", "PER_BID"]).optional(),
  endDate: z.string().optional(),
  itemEndMode: z.enum(["AUCTION_END", "CUSTOM", "NONE"]).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.method === "POST") {
    try {
      const parsed = createAuctionSchema.safeParse(req.body);

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
        joinMode,
        memberCanInvite,
        bidderVisibility,
        endDate,
        itemEndMode,
      } = parsed.data;

      // Check if open auctions are allowed
      const allowOpenAuctions = process.env.ALLOW_OPEN_AUCTIONS === "true";
      if (joinMode === "FREE" && !allowOpenAuctions) {
        return res.status(400).json({
          message: "Open auctions are not allowed on this server",
          errors: { joinMode: "Open auctions are disabled" },
        });
      }

      // Create auction with creator as owner
      const auction = await prisma.auction.create({
        data: {
          name,
          description: description || null,
          joinMode: joinMode || "INVITE_ONLY",
          memberCanInvite: memberCanInvite || false,
          bidderVisibility: bidderVisibility || "VISIBLE",
          endDate: endDate ? new Date(endDate) : null,
          itemEndMode: itemEndMode || "CUSTOM",
          creatorId: session.user.id,
          members: {
            create: {
              userId: session.user.id,
              role: "OWNER",
            },
          },
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: {
              items: true,
              members: true,
            },
          },
        },
      });

      return res.status(201).json(auction);
    } catch (error) {
      console.error("Create auction error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  if (req.method === "GET") {
    try {
      // Get all auctions the user is a member of
      const memberships = await prisma.auctionMember.findMany({
        where: { userId: session.user.id },
        include: {
          auction: {
            include: {
              creator: {
                select: { id: true, name: true, email: true },
              },
              _count: {
                select: {
                  items: true,
                  members: true,
                },
              },
            },
          },
        },
        orderBy: {
          joinedAt: "desc",
        },
      });

      const auctions = memberships.map((m) => ({
        ...m.auction,
        role: m.role,
      }));

      return res.status(200).json(auctions);
    } catch (error) {
      console.error("Get auctions error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
