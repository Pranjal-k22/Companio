import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { switchActiveOrganization } from '../controllers/organizationController.js';
import { verifyToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.schemas.js';
import { switchOrganizationSchema } from '../validators/organization.schemas.js';

const router = express.Router();

// Sensitive authentication rate limiter (50 attempts per 15 min per IP to protect against brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    type: 'https://companio.app/problems/rate-limited',
    title: 'Too Many Login Attempts',
    status: 429,
    detail: 'Too many authentication attempts. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

// Public routes with Zod schema validation
router.post('/register', validateRequest({ body: registerSchema }), register);
router.post('/login', authLimiter, validateRequest({ body: loginSchema }), login);
router.post('/forgot-password', authLimiter, validateRequest({ body: forgotPasswordSchema }), forgotPassword);
router.post('/reset-password', authLimiter, validateRequest({ body: resetPasswordSchema }), resetPassword);

// Protected routes
router.get('/me', verifyToken, getMe);
router.put('/profile', verifyToken, validateRequest({ body: updateProfileSchema }), updateProfile);
router.post(
  '/active-organization',
  verifyToken,
  validateRequest({ body: switchOrganizationSchema }),
  switchActiveOrganization
);

export default router;
