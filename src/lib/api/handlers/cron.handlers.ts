import { ApiHandler, Middleware } from "../types";
import { UnauthorizedError } from "../errors";
import { retryFailedEmails, processPendingEmails } from "@/lib/email";

// ============================================================================
// Cron Middleware
// ============================================================================

/**
 * Verify cron secret for security (Vercel Cron sends this header)
 */
export const withCronSecret: Middleware = (next) => async (req, res, ctx) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    throw new UnauthorizedError("Invalid cron secret");
  }

  return next(req, res, ctx);
};

// ============================================================================
// Email Retry Handler
// ============================================================================

export const retryEmails: ApiHandler = async (_req, res) => {
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
};
