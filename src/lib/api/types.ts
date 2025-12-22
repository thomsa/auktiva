import type { NextApiRequest, NextApiResponse } from "next";
import type { Session } from "next-auth";
import type { AuctionMember, Auction } from "@/generated/prisma/client";

/**
 * Extended context passed through middleware chain
 */
export interface ApiContext {
  session?: Session & { user: { id: string; email: string; name?: string } };
  membership?: AuctionMember & { auction?: Partial<Auction> };
  params: Record<string, string>;
}

/**
 * Handler function signature
 */
export type ApiHandler<T = unknown> = (
  req: NextApiRequest,
  res: NextApiResponse<T>,
  ctx: ApiContext,
) => Promise<void> | void;

/**
 * Middleware function - wraps a handler and can modify context or short-circuit
 */
export type Middleware = (next: ApiHandler) => ApiHandler;

/**
 * HTTP methods supported by the handler
 */
export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/**
 * Configuration for createHandler
 */
export type HandlerConfig = {
  [K in HttpMethod]?: ApiHandler | [Middleware[], ApiHandler];
};
