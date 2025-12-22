import type { NextApiRequest, NextApiResponse } from "next";
import type { ApiContext, ApiHandler, HttpMethod, Middleware } from "./types";
import { ApiError, MethodNotAllowedError } from "./errors";

export type HandlerConfig = {
  [K in HttpMethod]?: ApiHandler | [Middleware[], ApiHandler];
};

/**
 * Compose middleware chain with final handler
 */
function composeMiddleware(
  middlewares: Middleware[],
  handler: ApiHandler,
): ApiHandler {
  return middlewares.reduceRight(
    (next, middleware) => middleware(next),
    handler,
  );
}

/**
 * Extract params from query (convert string | string[] to string)
 */
function extractParams(query: NextApiRequest["query"]): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") {
      params[key] = value;
    } else if (Array.isArray(value) && value.length > 0) {
      params[key] = value[0];
    }
  }
  return params;
}

/**
 * Handle errors thrown by handlers/middleware
 */
function handleError(error: unknown, res: NextApiResponse): void {
  if (error instanceof ApiError) {
    const response: Record<string, unknown> = {
      message: error.message,
      code: error.code,
    };

    if (error.details) {
      Object.assign(response, error.details);
    }

    res.status(error.statusCode).json(response);
    return;
  }

  // Log unexpected errors
  console.error("Unhandled API error:", error);

  res.status(500).json({
    message: "Internal server error",
    code: "INTERNAL_SERVER_ERROR",
  });
}

/**
 * Create an API handler with method routing and middleware support
 *
 * @example
 * // Simple usage
 * export default createHandler({
 *   GET: getItems,
 *   POST: [withAuth, createItem],
 * });
 *
 * @example
 * // With middleware chain
 * export default createHandler({
 *   GET: [[withAuth, withMembership], getItem],
 *   PATCH: [[withAuth, withMembership, withOwnership], updateItem],
 *   DELETE: [[withAuth, withMembership, withOwnership], deleteItem],
 * });
 */
export function createHandler(config: HandlerConfig) {
  return async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    const method = req.method?.toUpperCase() as HttpMethod;

    const handlerConfig = config[method];

    if (!handlerConfig) {
      handleError(new MethodNotAllowedError(), res);
      return;
    }

    // Initialize context
    const ctx: ApiContext = {
      params: extractParams(req.query),
    };

    try {
      // Determine if it's a simple handler or [middleware[], handler]
      if (typeof handlerConfig === "function") {
        // Simple handler, no middleware
        await handlerConfig(req, res, ctx);
      } else {
        // Middleware chain + handler
        const [middlewares, handler] = handlerConfig;
        const composedHandler = composeMiddleware(middlewares, handler);
        await composedHandler(req, res, ctx);
      }
    } catch (error) {
      handleError(error, res);
    }
  };
}
