import { ZodError } from 'zod';
import { AppError, ValidationError, NotFoundError, ConflictError } from '../errors/AppError.js';
import logger from '../utils/logger.js';

/**
 * Normalizes different error types into an RFC 9457 compliant Problem Details object.
 */
export function normalizeError(err, req) {
  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const fieldErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return new ValidationError('Request validation failed.', fieldErrors);
  }

  // 2. Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    const fieldErrors = Object.keys(err.errors || {}).map((key) => ({
      field: key,
      message: err.errors[key].message,
    }));
    return new ValidationError('Database document validation failed.', fieldErrors);
  }

  // 3. Mongoose Cast Errors (Invalid ObjectId)
  if (err.name === 'CastError') {
    return new NotFoundError(`Invalid identifier format for resource: ${err.value}`);
  }

  // 4. MongoDB Duplicate Key Error (Code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return new ConflictError(`A record with this ${field} already exists.`);
  }

  // 5. Express JSON body parser error (malformed JSON)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return new ValidationError('Malformed JSON payload in request body.');
  }

  // 6. Already an AppError instance
  if (err instanceof AppError) {
    return err;
  }

  // 7. Unhandled / generic errors
  return new AppError({
    statusCode: err.statusCode || err.status || 500,
    title: 'Internal Server Error',
    detail: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please contact clinical support.'
      : err.message || 'Internal server error.',
    code: 'INTERNAL_ERROR',
    type: 'https://companio.app/problems/internal-server-error',
    isOperational: false,
  });
}

/**
 * Centralized Global Error Handler Middleware
 * Formats every error as RFC 9457 Problem Details while maintaining
 * legacy { success: false, message: ... } compatibility for current frontend consumers.
 */
export function errorHandler(err, req, res, next) {
  const normalized = normalizeError(err, req);
  const isProd = process.env.NODE_ENV === 'production';
  const requestId = req.id || req.headers['x-request-id'] || 'unknown';

  // Log non-operational or 5xx server errors
  if (!normalized.isOperational || normalized.statusCode >= 500) {
    logger.error(`[Server Exception] ${normalized.title}: ${normalized.detail}`, {
      requestId,
      statusCode: normalized.statusCode,
      url: req.originalUrl,
      method: req.method,
      stack: isProd ? undefined : err.stack,
    });
  } else {
    logger.warn(`[Client Error] ${normalized.title} (${normalized.statusCode}): ${normalized.detail}`, {
      requestId,
      statusCode: normalized.statusCode,
      url: req.originalUrl,
      fieldErrors: normalized.errors,
    });
  }

  const problemDetails = {
    type: normalized.type,
    title: normalized.title,
    status: normalized.statusCode,
    detail: normalized.detail,
    instance: req.originalUrl || req.url,
    code: normalized.code,
    requestId,
    ...(normalized.errors ? { errors: normalized.errors } : {}),
    ...(isProd ? {} : { stack: err.stack }),
    // Dual compatibility for existing frontend clients & legacy test scripts:
    success: false,
    message: normalized.detail,
  };

  res.status(normalized.statusCode).json(problemDetails);
}

/**
 * Catch-all 404 handler for unknown routes
 */
export function notFoundHandler(req, res, next) {
  next(new NotFoundError(`Endpoint not found: ${req.method} ${req.originalUrl}`));
}

export default errorHandler;

