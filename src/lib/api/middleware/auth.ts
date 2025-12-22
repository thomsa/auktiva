import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UnauthorizedError } from "../errors";
import type { Middleware } from "../types";

/**
 * Middleware that ensures the user is authenticated.
 * Adds session to context.
 */
export const withAuth: Middleware = (next) => async (req, res, ctx) => {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  ctx.session = session as typeof ctx.session;

  return next(req, res, ctx);
};
