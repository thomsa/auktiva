import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as itemService from "@/lib/services/item.service";

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

  // Check if user is admin in this auction
  const membership = await prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId,
        userId: session.user.id,
      },
    },
  });

  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return res.status(403).json({ message: "Not authorized" });
  }

  try {
    const items = await itemService.getAdminEditableItems(
      auctionId,
      session.user.id,
    );

    return res.status(200).json({ items });
  } catch (error) {
    console.error("Failed to fetch admin items:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
