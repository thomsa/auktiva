export { createHandler } from "./create-handler";
export type { HandlerConfig } from "./create-handler";

export {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  MethodNotAllowedError,
  ConflictError,
  ValidationError,
  InternalServerError,
} from "./errors";

export {
  withAuth,
  withMembership,
  requireMembership,
  requireOwner,
  requireAdmin,
  withValidation,
  validatedHandler,
  withRateLimit,
  withAuthRateLimit,
  withRegistrationRateLimit,
  withBidRateLimit,
  withPasswordResetRateLimit,
} from "./middleware";
export type { ValidatedRequest } from "./middleware";

export type { ApiContext, ApiHandler, Middleware, HttpMethod } from "./types";

// Handler exports
export * from "./handlers";
