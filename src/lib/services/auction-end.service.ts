import { prisma } from "@/lib/prisma";
import * as notificationService from "./notification.service";

/**
 * Process items that have ended but winner hasn't been notified yet.
 * This runs as a background task triggered by notification polling.
 */
export async function processEndedItems(): Promise<number> {
  try {
    // Find items that:
    // 1. Have ended (endDate < now)
    // 2. Have a winner (highestBidderId exists)
    // 3. Winner hasn't been notified yet
    const endedItems = await prisma.auctionItem.findMany({
      where: {
        endDate: { lt: new Date() },
        highestBidderId: { not: null },
        winnerNotified: false,
      },
      include: {
        currency: { select: { symbol: true } },
        auction: { select: { id: true, name: true } },
      },
      take: 50, // Process max 50 at a time to avoid long-running queries
    });

    if (endedItems.length === 0) {
      return 0;
    }

    // Process each ended item
    await Promise.all(
      endedItems.map(async (item) => {
        try {
          // Create winner notification
          await notificationService.notifyAuctionWon(
            item.highestBidderId!,
            item.name,
            item.auction.id,
            item.id,
            item.currentBid!,
            item.currency.symbol,
          );

          // Mark as notified
          await prisma.auctionItem.update({
            where: { id: item.id },
            data: { winnerNotified: true },
          });
        } catch (err) {
          console.error(
            `Failed to notify winner for item ${item.id}:`,
            err,
          );
        }
      }),
    );

    return endedItems.length;
  } catch (err) {
    console.error("Failed to process ended items:", err);
    return 0;
  }
}
