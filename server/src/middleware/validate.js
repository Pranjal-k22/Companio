import { ZodError } from 'zod';
import { ValidationError } from '../errors/AppError.js';

/**
 * Express middleware factory for validating request parameters against Zod schemas.
 * 
 * @param {object} schemas - { body?: ZodSchema, query?: ZodSchema, params?: ZodSchema }
 */
export function validateRequest(schemas = {}) {
  return async (req, res, next) => {
    try {
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = err.issues || err.errors || [];
        const fieldErrors = issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
        }));
        return next(new ValidationError('Request validation failed.', fieldErrors));
      }
      next(err);
    }
  };
}

export default validateRequest;

