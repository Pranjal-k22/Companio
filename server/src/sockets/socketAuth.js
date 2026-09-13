import jwt from 'jsonwebtoken';
import { User, Patient } from '../models/index.js';

/**
 * Socket.io authentication middleware
 * Verifies JWT provided in socket.handshake.auth.token or headers.authorization
 */
export const socketAuthMiddleware = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      console.warn(`[Socket Auth Warning] Rejected connection from ${socket.id}: No token provided.`);
      return next(new Error('Authentication error: No JWT token provided in connection handshake.'));
    }

    const jwtSecret = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_in_production';
    const decoded = jwt.verify(token, jwtSecret);

    // Fetch user from DB
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return next(new Error('Authentication error: User account no longer exists.'));
    }

    let patientId = null;
    if (user.role === 'PATIENT') {
      const patient = await Patient.findOne({ userId: user._id });
      if (patient) patientId = patient._id.toString();
    }

    // Attach user profile to socket instance
    socket.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      patientId,
    };

    console.log(`[Socket Auth] Authenticated socket connection ${socket.id} for ${user.name} (${user.role})`);
    next();
  } catch (error) {
    console.warn(`[Socket Auth Error] Token verification failed for ${socket.id}: ${error.message}`);
    next(new Error(`Authentication error: ${error.message}`));
  }
};

export default socketAuthMiddleware;
