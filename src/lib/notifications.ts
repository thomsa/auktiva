import { prisma } from "@/lib/prisma";
import { NotificationType } from "@/generated/prisma/client";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  imageUrl?: string;
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
      imageUrl: params.imageUrl,
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

export async function notifyNewItem(
  userId: string,
  itemName: string,
  itemDescription: string | null,
  imageUrl: string | null,
  auctionId: string,
  itemId: string,
) {
  // Truncate description to 50 chars
  const truncatedDescription = itemDescription
    ? itemDescription.length > 50
      ? itemDescription.substring(0, 50) + "..."
      : itemDescription
    : "No description";

  return createNotification({
    userId,
    type: "NEW_ITEM",
    title: itemName,
    message: truncatedDescription,
    imageUrl: imageUrl || undefined,
    auctionId,
    itemId,
  });
}
