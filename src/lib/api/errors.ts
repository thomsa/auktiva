/**
 * Base API Error class - all custom API errors extend this
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * 400 Bad Request - Invalid input or validation errors
 */
export class BadRequestError extends ApiError {
  constructor(message = "Bad request", details?: Record<string, unknown>) {
    super(message, 400, "BAD_REQUEST", details);
    this.name = "BadRequestError";
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * 401 Unauthorized - User is not authenticated
 */
export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * 403 Forbidden - User lacks permission for this action
 */
export class ForbiddenError extends ApiError {
  constructor(message = "You don't have permission to perform this action") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * 404 Not Found - Resource does not exist
 */
export class NotFoundError extends ApiError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 405 Method Not Allowed - HTTP method not supported
 */
export class MethodNotAllowedError extends ApiError {
  constructor(message = "Method not allowed") {
    super(message, 405, "METHOD_NOT_ALLOWED");
    this.name = "MethodNotAllowedError";
    Object.setPrototypeOf(this, MethodNotAllowedError.prototype);
  }
}

/**
 * 409 Conflict - Resource state conflict
 */
export class ConflictError extends ApiError {
  constructor(message = "Resource conflict") {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * 422 Unprocessable Entity - Validation failed
 */
export class ValidationError extends ApiError {
  public readonly errors: Record<string, string[]>;

  constructor(
    message = "Validation failed",
    errors: Record<string, string[]> = {},
  ) {
    super(message, 422, "VALIDATION_ERROR", { errors });
    this.name = "ValidationError";
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 500 Internal Server Error - Unexpected server error
 */
export class InternalServerError extends ApiError {
  constructor(message = "Internal server error") {
    super(message, 500, "INTERNAL_SERVER_ERROR");
    this.name = "InternalServerError";
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}
