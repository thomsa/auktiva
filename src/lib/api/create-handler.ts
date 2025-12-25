import type { NextApiRequest, NextApiResponse } from "next";
import type { ApiContext, ApiHandler, HttpMethod, Middleware } from "./types";
import { ApiError, MethodNotAllowedError } from "./errors";
import { apiLogger as logger } from "@/lib/logger";

export type HandlerConfig = {
  [K in HttpMethod]?: ApiHandler | [Middleware[], ApiHandler];
};

/**
 * Compose middleware chain with final handler
 */
function composeMiddleware(
  middlewares: Middleware[],
  handler: ApiHandler
): ApiHandler {
  return middlewares.reduceRight(
    (next, middleware) => middleware(next),
    handler
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
function handleError(
  error: unknown,
  res: NextApiResponse,
  requestInfo: { method: string; path: string; duration: number }
): void {
  const { method, path, duration } = requestInfo;

  if (error instanceof ApiError) {
    // Log expected API errors at warn level (client errors) or error level (server errors)
    const logLevel = error.statusCode >= 500 ? "error" : "warn";
    logger[logLevel](
      {
        method,
        path,
        statusCode: error.statusCode,
        errorCode: error.code,
        message: error.message,
        duration,
        ...(error.details && { details: error.details }),
      },
      `API error: ${error.message}`
    );

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

  // Log unexpected errors with full stack trace
  logger.error(
    {
      method,
      path,
      statusCode: 500,
      err: error,
      duration,
    },
    "Unhandled API error"
  );

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
    const startTime = Date.now();
    const method = req.method?.toUpperCase() as HttpMethod;
    const path = req.url || "unknown";

    // Log incoming request
    logger.debug(
      {
        method,
        path,
        query: req.query,
        userAgent: req.headers["user-agent"],
      },
      "Incoming request"
    );

    const handlerConfig = config[method];

    if (!handlerConfig) {
      const duration = Date.now() - startTime;
      handleError(new MethodNotAllowedError(), res, { method, path, duration });
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

      // Log successful response
      const duration = Date.now() - startTime;
      logger.debug(
        {
          method,
          path,
          statusCode: res.statusCode,
          duration,
        },
        "Request completed"
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      handleError(error, res, { method, path, duration });
    }
  };
}
