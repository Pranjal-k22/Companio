/**
 * Companio Phase 10: Rate Limiting Middleware
 * Protects authentication, invitation acceptance, and sensitive APIs against brute force attacks.
 * Outputs standard RFC 9457 RateLimitError on quota violation.
 */
import rateLimit from 'express-rate-limit';
import { RateLimitError } from '../errors/AppError.js';

/**
 * Strict rate limiter for authentication and sensitive credential endpoints.
 * Allows 15 requests per 15-minute window per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 15,
  standardHeaders: true, // Return standard RateLimit headers
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new RateLimitError('Too many authentication attempts. Please try again after 15 minutes.'));
  },
});

/**
 * General API rate limiter for standard endpoints.
 * Allows 300 requests per minute per IP.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'test' ? 5000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new RateLimitError('API rate limit exceeded. Please throttle your requests.'));
  },
});

export default {
  authRateLimiter,
  apiRateLimiter,
};
