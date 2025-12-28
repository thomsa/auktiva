/**
 * Email Service Functions
 *
 * These functions send emails via Brevo. They create EmailLog entries
 * in the database before sending, which enables:
 * - Tracking of all sent emails
 * - Automatic retry of failed emails via cron job
 * - Audit trail for debugging
 *
 * The sendEmail function in brevo.ts creates the EmailLog entry and attempts
 * to send immediately. Failed emails are marked as FAILED and can be retried
 * by the cron job.
 */

import { sendEmail } from "./brevo";
import { prisma } from "@/lib/prisma";
import {
  getWelcomeTemplateData,
  getInviteTemplateData,
  getNewItemTemplateData,
  getOutbidTemplateData,
  getItemWonTemplateData,
} from "./templates";
import { createLogger } from "@/lib/logger";

const emailServiceLogger = createLogger("email-service");
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.auktiva.org";

/**
 * Environment info:
 * - On Vercel (serverless): Emails are queued and sent immediately. If the
 *   function times out or fails, the cron job picks up PENDING/FAILED emails.
 * - On non-Vercel (self-hosted): Same behavior, but cron is optional since
 *   the server can handle longer-running processes.
 *
 * Both paths use the same sendEmail function which handles the EmailLog creation
 * and immediate send attempt.
 */

// ============================================================================
// Queue Functions - Call these from API routes/services
// ============================================================================

/**
 * Queue a welcome email for a newly registered user
 */
export async function queueWelcomeEmail(params: {
  userId: string;
  email: string;
  name: string;
}): Promise<boolean> {
  const { userId, email, name } = params;

  emailServiceLogger.info({ email, userId }, "Queueing welcome email");

  try {
    const templateData = getWelcomeTemplateData({
      name,
      appUrl: APP_URL,
    });

    const result = await sendEmail({
      to: email,
      toName: name,
      subject: "Welcome to Auktiva! 🎉",
      mjmlTemplate: templateData.template,
      replacements: templateData.replacements,
      type: "WELCOME",
      metadata: { userId },
    });
    emailServiceLogger.debug(
      { email, userId, result },
      "Welcome email queue result",
    );
    return result;
  } catch (err) {
    emailServiceLogger.error(
      { err, email, userId },
      "Failed to queue welcome email",
    );
    return false;
  }
}

/**
 * Queue an invite email
 */
export async function queueInviteEmail(params: {
  inviteId: string;
  email: string;
  auctionId: string;
  auctionName: string;
  senderName: string;
  token: string;
  role: string;
}): Promise<boolean> {
  const { inviteId, email, auctionId, auctionName, senderName, token, role } =
    params;

  emailServiceLogger.info(
    { email, auctionId, inviteId, role },
    "Queueing invite email",
  );

  try {
    const templateData = getInviteTemplateData({
      senderName,
      auctionName,
      role,
      token,
      appUrl: APP_URL,
    });

    const result = await sendEmail({
      to: email,
      subject: `You're invited to "${auctionName}" on Auktiva`,
      mjmlTemplate: templateData.template,
      replacements: templateData.replacements,
      type: "INVITE",
      metadata: { inviteId, auctionId },
    });
    emailServiceLogger.debug(
      { email, auctionId, inviteId, result },
      "Invite email queue result",
    );
    return result;
  } catch (err) {
    emailServiceLogger.error(
      { err, email, auctionId, inviteId },
      "Failed to queue invite email",
    );
    return false;
  }
}

/**
 * Queue new item notification emails to all eligible auction members
 */
export async function queueNewItemEmails(params: {
  itemId: string;
  itemName: string;
  itemDescription: string | null;
  itemImageUrl: string | null;
  auctionId: string;
  auctionName: string;
  creatorId: string;
}): Promise<{ sent: number; failed: number }> {
  const {
    itemId,
    itemName,
    itemDescription,
    itemImageUrl,
    auctionId,
    auctionName,
    creatorId,
  } = params;

  emailServiceLogger.info(
    { itemId, itemName, auctionId, creatorId },
    "Queueing new item emails",
  );

  try {
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

    emailServiceLogger.debug(
      {
        itemId,
        totalMembers: members.length,
        eligibleMembers: eligibleMembers.length,
      },
      "Filtered eligible members for new item notification",
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

    let sent = 0;
    let failed = 0;

    for (const member of eligibleMembers) {
      try {
        const result = await sendEmail({
          to: member.user.email,
          toName: member.user.name || undefined,
          subject: `New item in "${auctionName}": ${itemName}`,
          mjmlTemplate: templateData.template,
          replacements: templateData.replacements,
          type: "NEW_ITEM",
          metadata: { itemId, auctionId, userId: member.user.id },
        });
        if (result) sent++;
        else failed++;
      } catch (memberErr) {
        failed++;
        emailServiceLogger.error(
          { err: memberErr, itemId, memberEmail: member.user.email },
          "Failed to queue new item email to member",
        );
      }
    }

    emailServiceLogger.info(
      { itemId, auctionId, sent, failed },
      "Completed queueing new item notifications",
    );

    return { sent, failed };
  } catch (err) {
    emailServiceLogger.error(
      { err, itemId, auctionId },
      "Failed to queue new item emails",
    );
    return { sent: 0, failed: 0 };
  }
}

/**
 * Queue an outbid notification email
 */
export async function queueOutbidEmail(params: {
  previousBidderId: string;
  previousBidderEmail: string;
  previousBidderName: string;
  itemId: string;
  itemName: string;
  auctionId: string;
  auctionName: string;
  newAmount: number;
  currencySymbol: string;
}): Promise<boolean> {
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
  } = params;

  emailServiceLogger.info(
    { itemId, auctionId, previousBidderId, newAmount },
    "Queueing outbid email",
  );

  try {
    // Check if user has email notifications enabled
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: previousBidderId },
      select: { emailOnOutbid: true },
    });

    // Default is true if no settings exist
    if (userSettings?.emailOnOutbid === false) {
      emailServiceLogger.debug(
        { itemId, previousBidderId },
        "User has disabled outbid notifications, skipping",
      );
      return true; // Not an error, just skipped
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

    const result = await sendEmail({
      to: previousBidderEmail,
      toName: previousBidderName,
      subject: `You've been outbid on "${itemName}"`,
      mjmlTemplate: templateData.template,
      replacements: templateData.replacements,
      type: "OUTBID",
      metadata: { itemId, auctionId, userId: previousBidderId, newAmount },
    });
    emailServiceLogger.debug(
      { itemId, auctionId, previousBidderId, result },
      "Outbid email queue result",
    );
    return result;
  } catch (err) {
    emailServiceLogger.error(
      { err, itemId, auctionId, previousBidderId },
      "Failed to queue outbid email",
    );
    return false;
  }
}

/**
 * Queue an item won notification email
 */
export async function queueItemWonEmail(params: {
  winnerId: string;
  winnerEmail: string;
  winnerName: string | null;
  itemId: string;
  itemName: string;
  auctionId: string;
  auctionName: string;
  winningAmount: number;
  currencySymbol: string;
}): Promise<boolean> {
  const {
    winnerId,
    winnerEmail,
    winnerName,
    itemId,
    itemName,
    auctionId,
    auctionName,
    winningAmount,
    currencySymbol,
  } = params;

  emailServiceLogger.info(
    { itemId, auctionId, winnerId, winningAmount },
    "Queueing item won email",
  );

  try {
    // Check if user has email notifications enabled
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: winnerId },
      select: { emailOnItemWon: true },
    });

    // Default is false for this notification type
    if (userSettings?.emailOnItemWon !== true) {
      emailServiceLogger.debug(
        { itemId, winnerId },
        "User has not enabled item won notifications, skipping",
      );
      return true; // Not an error, just skipped
    }

    const templateData = getItemWonTemplateData({
      itemName,
      auctionName,
      auctionId,
      itemId,
      winningAmount,
      currencySymbol,
      appUrl: APP_URL,
    });

    const result = await sendEmail({
      to: winnerEmail,
      toName: winnerName || undefined,
      subject: `Congratulations! You won "${itemName}"`,
      mjmlTemplate: templateData.template,
      replacements: templateData.replacements,
      type: "ITEM_WON",
      metadata: { itemId, auctionId, userId: winnerId, winningAmount },
    });
    emailServiceLogger.debug(
      { itemId, auctionId, winnerId, result },
      "Item won email queue result",
    );
    return result;
  } catch (err) {
    emailServiceLogger.error(
      { err, itemId, auctionId, winnerId },
      "Failed to queue item won email",
    );
    return false;
  }
}
