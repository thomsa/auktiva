import type { ZodSchema, ZodError } from "zod";
import { ValidationError } from "../errors";
import type { Middleware, ApiHandler, ApiContext } from "../types";
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Middleware that validates request body against a Zod schema.
 * Throws ValidationError if validation fails.
 *
 * @example
 * const updateSchema = z.object({ name: z.string() });
 * export default createHandler({
 *   PATCH: [[withAuth, withValidation(updateSchema)], updateItem],
 * });
 */
export function withValidation<T>(schema: ZodSchema<T>): Middleware {
  return (next) => async (req, res, ctx) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      const firstError = Object.values(errors).flat()[0] || "Invalid input";
      throw new ValidationError(firstError, errors);
    }

    // Attach validated data to request for handler to use
    (req as NextApiRequest & { validatedBody: T }).validatedBody = result.data;

    return next(req, res, ctx);
  };
}

/**
 * Format Zod errors into a flat object
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_root";
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }

  return errors;
}

/**
 * Helper type for handlers that use validated body
 */
export type ValidatedRequest<T> = NextApiRequest & { validatedBody: T };

/**
 * Helper to create a handler that expects validated body
 */
export function validatedHandler<T>(
  handler: (
    req: ValidatedRequest<T>,
    res: NextApiResponse,
    ctx: ApiContext,
  ) => Promise<void> | void,
): ApiHandler {
  return handler as ApiHandler;
}
