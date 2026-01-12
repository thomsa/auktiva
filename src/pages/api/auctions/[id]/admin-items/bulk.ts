import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bulkUpdateSchema = z.object({
  itemIds: z.array(z.string()),
  updates: z.object({
    currencyCode: z.string().optional(),
    startingBid: z.number().min(0).optional(),
    minBidIncrement: z.number().min(0.01).optional(),
    isPublished: z.boolean().optional(),
    discussionsEnabled: z.boolean().optional(),
    isEditableByAdmin: z.boolean().optional(),
  }),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "PATCH") {
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

  const parsed = bulkUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }

  const { itemIds, updates } = parsed.data;

  try {
    // Get ALL requested items to provide detailed error info
    const allRequestedItems = await prisma.auctionItem.findMany({
      where: {
        id: { in: itemIds },
        auctionId,
      },
      select: {
        id: true,
        name: true,
        creatorId: true,
        isEditableByAdmin: true,
        _count: { select: { bids: true } },
      },
    });

    // Build a map for quick lookup
    const itemMap = new Map(allRequestedItems.map((item) => [item.id, item]));

    const updateData: Record<string, unknown> = {
      lastUpdatedById: session.user.id,
    };
    let updated = 0;
    let skipped = 0;
    const errors: Array<{
      itemId: string;
      itemName: string;
      errorType: "notOwner" | "hasBids" | "notEditable";
    }> = [];

    // Build update data based on what's allowed
    if (updates.minBidIncrement !== undefined) {
      updateData.minBidIncrement = updates.minBidIncrement;
    }
    if (updates.discussionsEnabled !== undefined) {
      updateData.discussionsEnabled = updates.discussionsEnabled;
    }

    // Process each requested item
    for (const itemId of itemIds) {
      const item = itemMap.get(itemId);

      // Item not found in this auction
      if (!item) {
        skipped++;
        continue;
      }

      const hasBids = item._count.bids > 0;
      const isOwner = item.creatorId === session.user.id;
      const canEdit = isOwner || item.isEditableByAdmin;

      // Check if user can edit this item at all
      if (!canEdit) {
        errors.push({
          itemId: item.id,
          itemName: item.name,
          errorType: "notEditable",
        });
        skipped++;
        continue;
      }

      const itemUpdateData = { ...updateData };

      // Only item owner can change isEditableByAdmin
      if (updates.isEditableByAdmin !== undefined) {
        if (isOwner) {
          itemUpdateData.isEditableByAdmin = updates.isEditableByAdmin;
        } else {
          // Non-owner trying to change isEditableByAdmin
          errors.push({
            itemId: item.id,
            itemName: item.name,
            errorType: "notOwner",
          });
          // Continue with other updates if any
        }
      }

      // Only allow currency/startingBid/unpublish changes if no bids
      if (!hasBids) {
        if (updates.currencyCode !== undefined) {
          itemUpdateData.currencyCode = updates.currencyCode;
        }
        if (updates.startingBid !== undefined) {
          itemUpdateData.startingBid = updates.startingBid;
        }
        if (updates.isPublished !== undefined) {
          itemUpdateData.isPublished = updates.isPublished;
        }
      } else {
        // With bids, can only publish (not unpublish)
        if (updates.isPublished === true) {
          itemUpdateData.isPublished = true;
        }
        // Report error if trying to change restricted fields
        if (
          updates.currencyCode !== undefined ||
          updates.startingBid !== undefined ||
          updates.isPublished === false
        ) {
          errors.push({
            itemId: item.id,
            itemName: item.name,
            errorType: "hasBids",
          });
          skipped++;
          continue;
        }
      }

      if (Object.keys(itemUpdateData).length > 1) {
        // > 1 because lastUpdatedById is always present
        await prisma.auctionItem.update({
          where: { id: item.id },
          data: itemUpdateData,
        });
        updated++;
      }
    }

    return res.status(200).json({ updated, skipped, errors });
  } catch (error) {
    console.error("Failed to bulk update admin items:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
