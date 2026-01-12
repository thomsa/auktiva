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

  try {
    // Get all auctions where user is OWNER or ADMIN
    const adminMemberships = await prisma.auctionMember.findMany({
      where: {
        userId: session.user.id,
        role: { in: ["OWNER", "ADMIN"] },
      },
      select: {
        auctionId: true,
      },
    });

    const adminAuctionIds = adminMemberships.map((m) => m.auctionId);

    return res.status(200).json({
      isAuctionAdmin: adminAuctionIds.length > 0,
      adminAuctionIds,
    });
  } catch (error) {
    console.error("Failed to fetch app data:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
