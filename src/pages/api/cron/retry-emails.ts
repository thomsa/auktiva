import type { NextApiRequest, NextApiResponse } from "next";
import { retryFailedEmails, processPendingEmails } from "@/lib/email";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Verify cron secret for security (Vercel Cron sends this header)
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // First process any pending emails
    const pendingResult = await processPendingEmails();

    // Then retry failed emails
    const retryResult = await retryFailedEmails();

    return res.status(200).json({
      ok: true,
      pending: pendingResult,
      retried: retryResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Email retry error:", error);
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
