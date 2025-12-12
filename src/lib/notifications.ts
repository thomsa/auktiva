import { prisma } from "@/lib/prisma";
import { NotificationType } from "@/generated/prisma/client";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  auctionId?: string;
  itemId?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      auctionId: params.auctionId,
      itemId: params.itemId,
    },
  });
}

export async function notifyOutbid(
  previousBidderId: string,
  itemName: string,
  auctionId: string,
  itemId: string,
  newAmount: number,
  currencySymbol: string,
) {
  return createNotification({
    userId: previousBidderId,
    type: "OUTBID",
    title: "You've been outbid!",
    message: `Someone placed a higher bid of ${currencySymbol}${newAmount.toFixed(2)} on "${itemName}"`,
    auctionId,
    itemId,
  });
}

export async function notifyAuctionWon(
  winnerId: string,
  itemName: string,
  auctionId: string,
  itemId: string,
  amount: number,
  currencySymbol: string,
) {
  return createNotification({
    userId: winnerId,
    type: "AUCTION_WON",
    title: "Congratulations! You won!",
    message: `You won "${itemName}" with a bid of ${currencySymbol}${amount.toFixed(2)}`,
    auctionId,
    itemId,
  });
}

export async function notifyMemberJoined(
  ownerId: string,
  memberName: string,
  auctionName: string,
  auctionId: string,
) {
  return createNotification({
    userId: ownerId,
    type: "MEMBER_JOINED",
    title: "New member joined",
    message: `${memberName} joined your auction "${auctionName}"`,
    auctionId,
  });
}
