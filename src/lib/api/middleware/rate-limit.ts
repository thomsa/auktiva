import { RateLimiterMemory } from "rate-limiter-flexible";
import type { Middleware } from "../types";
import { ApiError } from "../errors";

/**
 * Rate limiting middleware using rate-limiter-flexible
 *
 * IMPORTANT: This uses in-memory storage which works for:
 * - Local deployments (PM2, Docker, single server)
 * - Self-hosted instances
 *
 * For serverless deployments (Vercel, AWS Lambda), in-memory rate limiting
 * won't work reliably because each function invocation may run in a different
 * instance. For serverless, consider:
 * - @upstash/ratelimit with Upstash Redis
 * - Vercel KV
 * - RateLimiterRedis with external Redis
 *
 * The rate limiting is still useful as a defense-in-depth measure and works
 * fully for self-hosted deployments.
 */

interface RateLimitOptions {
  /** Maximum requests per window */
  points?: number;
  /** Window duration in seconds */
  duration?: number;
  /** Key prefix for different endpoints */
  keyPrefix?: string;
}

/**
 * Get client IP address from request
 */
function getClientIp(req: {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ip = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded.split(",")[0];
    return ip.trim();
  }

  const realIp = req.headers["x-real-ip"];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  return req.socket?.remoteAddress || "unknown";
}

// Cache rate limiters to avoid creating new instances on each request
const rateLimiterCache = new Map<string, RateLimiterMemory>();

function getRateLimiter(options: RateLimitOptions): RateLimiterMemory {
  const key = `${options.keyPrefix}-${options.points}-${options.duration}`;

  if (!rateLimiterCache.has(key)) {
    rateLimiterCache.set(
      key,
      new RateLimiterMemory({
        points: options.points || 10,
        duration: options.duration || 60,
        keyPrefix: options.keyPrefix || "global",
      }),
    );
  }

  return rateLimiterCache.get(key)!;
}

/**
 * Rate limiting middleware factory using rate-limiter-flexible
 *
 * @example
 * // 5 requests per minute
 * export default createHandler({
 *   POST: [[withRateLimit({ points: 5, duration: 60 })], handler],
 * });
 */
export function withRateLimit(options: RateLimitOptions = {}): Middleware {
  const rateLimiter = getRateLimiter(options);

  return (next) => async (req, res, ctx) => {
    const ip = getClientIp(req);

    try {
      const rateLimiterRes = await rateLimiter.consume(ip);

      // Set rate limit headers
      res.setHeader("X-RateLimit-Limit", options.points?.toString() || "10");
      res.setHeader(
        "X-RateLimit-Remaining",
        rateLimiterRes.remainingPoints.toString(),
      );
      res.setHeader(
        "X-RateLimit-Reset",
        Math.ceil(
          Date.now() / 1000 + rateLimiterRes.msBeforeNext / 1000,
        ).toString(),
      );

      return next(req, res, ctx);
    } catch (rateLimiterRes) {
      // Rate limited
      const retryAfter = Math.ceil(
        (rateLimiterRes as { msBeforeNext: number }).msBeforeNext / 1000,
      );

      res.setHeader("Retry-After", retryAfter.toString());
      res.setHeader("X-RateLimit-Limit", options.points?.toString() || "10");
      res.setHeader("X-RateLimit-Remaining", "0");

      throw new ApiError(
        "Too many requests. Please try again later.",
        429,
        "RATE_LIMITED",
        { retryAfter },
      );
    }
  };
}

/**
 * Stricter rate limit for authentication endpoints
 * 5 attempts per 15 minutes
 */
export const withAuthRateLimit = withRateLimit({
  points: 5,
  duration: 15 * 60, // 15 minutes in seconds
  keyPrefix: "auth",
});

/**
 * Rate limit for registration
 * 3 registrations per hour per IP
 */
export const withRegistrationRateLimit = withRateLimit({
  points: 3,
  duration: 60 * 60, // 1 hour in seconds
  keyPrefix: "register",
});

/**
 * Rate limit for bid placement
 * 30 bids per minute (allows rapid bidding but prevents abuse)
 */
export const withBidRateLimit = withRateLimit({
  points: 30,
  duration: 60, // 1 minute in seconds
  keyPrefix: "bid",
});

/**
 * Rate limit for password reset requests
 * 3 requests per hour (already implemented in service, this is additional protection)
 */
export const withPasswordResetRateLimit = withRateLimit({
  points: 3,
  duration: 60 * 60, // 1 hour in seconds
  keyPrefix: "password-reset",
});
