import { eventBus, EventMap } from "@/lib/events/event-bus";
import { sendEmail } from "./brevo";
import { prisma } from "@/lib/prisma";
import {
  getWelcomeTemplateData,
  getInviteTemplateData,
  getNewItemTemplateData,
  getOutbidTemplateData,
} from "./templates";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.auktiva.org";

// Handler for user registration - send welcome email
async function handleUserRegistered(
  payload: EventMap["user.registered"],
): Promise<void> {
  const { email, name } = payload;

  const templateData = getWelcomeTemplateData({
    name,
    appUrl: APP_URL,
  });

  await sendEmail({
    to: email,
    toName: name,
    subject: "Welcome to Auktiva! 🎉",
    mjmlTemplate: templateData.template,
    replacements: templateData.replacements,
    type: "WELCOME",
    metadata: { userId: payload.userId },
  });
}

// Handler for invite creation - send invite email
async function handleInviteCreated(
  payload: EventMap["invite.created"],
): Promise<void> {
  const { email, auctionName, senderName, token, role } = payload;

  const templateData = getInviteTemplateData({
    senderName,
    auctionName,
    role,
    token,
    appUrl: APP_URL,
  });

  await sendEmail({
    to: email,
    subject: `You're invited to "${auctionName}" on Auktiva`,
    mjmlTemplate: templateData.template,
    replacements: templateData.replacements,
    type: "INVITE",
    metadata: {
      inviteId: payload.inviteId,
      auctionId: payload.auctionId,
    },
  });
}

// Handler for new item creation - notify all auction members
async function handleItemCreated(
  payload: EventMap["item.created"],
): Promise<void> {
  const {
    itemId,
    itemName,
    itemDescription,
    itemImageUrl,
    auctionId,
    auctionName,
    creatorId,
  } = payload;

  // Get all auction members except the creator
  const members = await prisma.auctionMember.findMany({
    where: {
      auctionId,
      userId: { not: creatorId },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          settings: {
            select: { emailOnNewItem: true },
          },
        },
      },
    },
  });

  // Filter members who have email notifications enabled (default is true)
  const eligibleMembers = members.filter(
    (m) => m.user.settings?.emailOnNewItem !== false,
  );

  const templateData = getNewItemTemplateData({
    itemName,
    itemDescription,
    itemImageUrl,
    auctionName,
    auctionId,
    itemId,
    appUrl: APP_URL,
  });

  // Send emails to all eligible members
  for (const member of eligibleMembers) {
    await sendEmail({
      to: member.user.email,
      toName: member.user.name || undefined,
      subject: `New item in "${auctionName}": ${itemName}`,
      mjmlTemplate: templateData.template,
      replacements: templateData.replacements,
      type: "NEW_ITEM",
      metadata: {
        itemId,
        auctionId,
        userId: member.user.id,
      },
    });
  }
}

// Handler for outbid - notify the previous highest bidder
async function handleBidOutbid(payload: EventMap["bid.outbid"]): Promise<void> {
  const {
    previousBidderId,
    previousBidderEmail,
    previousBidderName,
    itemId,
    itemName,
    auctionId,
    auctionName,
    newAmount,
    currencySymbol,
  } = payload;

  // Check if user has email notifications enabled
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: previousBidderId },
    select: { emailOnOutbid: true },
  });

  // Default is true if no settings exist
  if (userSettings?.emailOnOutbid === false) {
    return;
  }

  const templateData = getOutbidTemplateData({
    itemName,
    auctionName,
    auctionId,
    itemId,
    newAmount,
    currencySymbol,
    appUrl: APP_URL,
  });

  await sendEmail({
    to: previousBidderEmail,
    toName: previousBidderName,
    subject: `You've been outbid on "${itemName}"`,
    mjmlTemplate: templateData.template,
    replacements: templateData.replacements,
    type: "OUTBID",
    metadata: {
      itemId,
      auctionId,
      userId: previousBidderId,
      newAmount,
    },
  });
}

// Track if handlers have been registered to prevent duplicates
let handlersRegistered = false;

// Register all handlers
export function registerEmailHandlers(): void {
  if (handlersRegistered) {
    return;
  }

  eventBus.on("user.registered", handleUserRegistered);
  eventBus.on("invite.created", handleInviteCreated);
  eventBus.on("item.created", handleItemCreated);
  eventBus.on("bid.outbid", handleBidOutbid);

  handlersRegistered = true;
  console.log("[Email] Event handlers registered");
}

// Auto-register handlers when this module is imported
registerEmailHandlers();
