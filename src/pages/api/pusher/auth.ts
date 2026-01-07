/**
 * Pusher/Soketi channel authentication endpoint
 *
 * This endpoint authenticates users for private channels.
 * Private channels are used for:
 * - private-user-{userId}: Personal notifications (outbid alerts, etc.)
 * - private-auction-{auctionId}: Auction-specific events for members only
 * - private-item-{itemId}: Item events (bids, discussions) for auction members
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { authenticateChannel, isRealtimeEnabled } from "@/lib/realtime";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  if (!isRealtimeEnabled()) {
    return res.status(503).json({ message: "Realtime is not enabled" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { socket_id, channel_name } = req.body;

  if (!socket_id || !channel_name) {
    return res
      .status(400)
      .json({ message: "Missing socket_id or channel_name" });
  }

  // Validate channel access
  const isAuthorized = await validateChannelAccess(
    channel_name,
    session.user.id,
  );

  if (!isAuthorized) {
    return res.status(403).json({ message: "Not authorized for this channel" });
  }

  // Generate auth response
  const authResponse = authenticateChannel(socket_id, channel_name);

  if (!authResponse) {
    return res.status(500).json({ message: "Failed to authenticate channel" });
  }

  res.status(200).json(authResponse);
}

/**
 * Validate that a user has access to a private channel
 */
async function validateChannelAccess(
  channelName: string,
  userId: string,
): Promise<boolean> {
  // Private user channel - user can only access their own channel
  if (channelName.startsWith("private-user-")) {
    const channelUserId = channelName.replace("private-user-", "");
    return channelUserId === userId;
  }

  // Private auction channel - user must be a member of the auction
  if (channelName.startsWith("private-auction-")) {
    const auctionId = channelName.replace("private-auction-", "");

    const membership = await prisma.auctionMember.findUnique({
      where: {
        auctionId_userId: {
          auctionId,
          userId,
        },
      },
    });

    return !!membership;
  }

  // Private item channel - user must be a member of the item's auction
  if (channelName.startsWith("private-item-")) {
    const itemId = channelName.replace("private-item-", "");

    // Get the item's auction and check membership
    const item = await prisma.auctionItem.findUnique({
      where: { id: itemId },
      select: { auctionId: true },
    });

    if (!item) {
      return false;
    }

    const membership = await prisma.auctionMember.findUnique({
      where: {
        auctionId_userId: {
          auctionId: item.auctionId,
          userId,
        },
      },
    });

    return !!membership;
  }

  // Unknown private channel type - deny access
  console.warn(`[Pusher Auth] Unknown private channel type: ${channelName}`);
  return false;
}
