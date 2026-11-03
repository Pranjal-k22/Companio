/**
 * Base Application Error implementing RFC 9457 Problem Details
 */
export class AppError extends Error {
  constructor({
    statusCode = 500,
    title = 'Internal Server Error',
    detail = 'An unexpected error occurred.',
    code = 'INTERNAL_ERROR',
    type = 'https://companio.app/problems/internal-server-error',
    errors = undefined,
    isOperational = true,
  }) {
    super(detail);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.title = title;
    this.detail = detail;
    this.code = code;
    this.type = type;
    this.errors = errors;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(detail = 'One or more fields failed validation.', errors = []) {
    super({
      statusCode: 400,
      title: 'Validation Error',
      detail,
      code: 'VALIDATION_ERROR',
      type: 'https://companio.app/problems/validation-error',
      errors,
    });
  }
}

export class AuthenticationError extends AppError {
  constructor(detail = 'Authentication is required to access this resource.') {
    super({
      statusCode: 401,
      title: 'Authentication Required',
      detail,
      code: 'AUTHENTICATION_REQUIRED',
      type: 'https://companio.app/problems/unauthenticated',
    });
  }
}

export class AuthorizationError extends AppError {
  constructor(detail = 'You do not have permission to access this clinical resource.') {
    super({
      statusCode: 403,
      title: 'Forbidden Access',
      detail,
      code: 'FORBIDDEN_ACCESS',
      type: 'https://companio.app/problems/forbidden',
    });
  }
}

export class NotFoundError extends AppError {
  constructor(detail = 'The requested resource was not found.') {
    super({
      statusCode: 404,
      title: 'Resource Not Found',
      detail,
      code: 'RESOURCE_NOT_FOUND',
      type: 'https://companio.app/problems/not-found',
    });
  }
}

export class ConflictError extends AppError {
  constructor(detail = 'A resource conflict occurred.') {
    super({
      statusCode: 409,
      title: 'Resource Conflict',
      detail,
      code: 'RESOURCE_CONFLICT',
      type: 'https://companio.app/problems/conflict',
    });
  }
}

export class RateLimitError extends AppError {
  constructor(detail = 'Too many requests. Please slow down and try again later.') {
    super({
      statusCode: 429,
      title: 'Rate Limit Exceeded',
      detail,
      code: 'RATE_LIMIT_EXCEEDED',
      type: 'https://companio.app/problems/rate-limited',
    });
  }
}

export class ExternalServiceError extends AppError {
  constructor(serviceName, detail = 'Upstream clinical service communication failure.') {
    super({
      statusCode: 502,
      title: 'Bad Gateway / External Service Error',
      detail: `[${serviceName}] ${detail}`,
      code: 'EXTERNAL_SERVICE_ERROR',
      type: 'https://companio.app/problems/external-service-error',
    });
    this.serviceName = serviceName;
  }
}

export class InternalServerError extends AppError {
  constructor(detail = 'Internal server processing error.') {
    super({
      statusCode: 500,
      title: 'Internal Server Error',
      detail,
      code: 'INTERNAL_SERVER_ERROR',
      type: 'https://companio.app/problems/internal-server-error',
      isOperational: false,
    });
  }
}

