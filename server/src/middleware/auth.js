import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AuthenticationError } from '../errors/AppError.js';

/**
 * Middleware to verify JWT token attached in Authorization header
 * Header format: Authorization: Bearer <token>
 */
export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AuthenticationError('Access denied. No authentication token provided.'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const jwtSecret = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_in_production';
    const decoded = jwt.verify(token, jwtSecret);

    // Fetch user profile from database to ensure user still exists and role is current
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return next(new AuthenticationError('Invalid token. User account no longer exists.'));
    }

    // Attach user information to request
    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    console.warn(`[Auth Warning] JWT Verification failed: ${error.message}`);
    return next(new AuthenticationError('Authentication failed. Invalid or expired token.'));
  }
};

export const authenticateToken = verifyToken;
export default verifyToken;
