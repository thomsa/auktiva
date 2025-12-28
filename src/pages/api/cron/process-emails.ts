import type { NextApiRequest, NextApiResponse } from "next";
import { processPendingEmails, retryFailedEmails } from "@/lib/email/brevo";
import { createLogger } from "@/lib/logger";

const cronLogger = createLogger("cron-emails");

/**
 * Cron job endpoint to process pending and retry failed emails.
 *
 * This should be called by Vercel Cron every minute.
 * Protected by CRON_SECRET to prevent unauthorized access.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Only allow GET requests (Vercel Cron uses GET)
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    cronLogger.warn("Unauthorized cron request attempt");
    return res.status(401).json({ error: "Unauthorized" });
  }

  cronLogger.info("Starting email processing cron job");

  try {
    // Process pending emails first
    const pendingResult = await processPendingEmails();

    // Then retry failed emails
    const retryResult = await retryFailedEmails();

    const result = {
      success: true,
      pending: pendingResult,
      retry: retryResult,
      timestamp: new Date().toISOString(),
    };

    cronLogger.info(result, "Email processing cron job completed");

    return res.status(200).json(result);
  } catch (err) {
    cronLogger.error({ err }, "Email processing cron job failed");
    return res.status(500).json({
      success: false,
      error: "Failed to process emails",
    });
  }
}
