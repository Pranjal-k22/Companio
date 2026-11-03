import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User, Patient, Membership, Organization } from '../models/index.js';

/**
 * Socket.io authentication & tenant resolution middleware
 * Verifies JWT and resolves active organization membership for the socket connection.
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

    // Determine requested organization
    const requestedOrgId =
      socket.handshake.auth?.organizationId ||
      socket.handshake.headers?.['x-organization-id'];

    let membership = null;
    if (requestedOrgId && mongoose.Types.ObjectId.isValid(requestedOrgId)) {
      membership = await Membership.findOne({
        organizationId: new mongoose.Types.ObjectId(requestedOrgId),
        userId: user._id,
        status: 'active',
      });
    } else {
      membership = await Membership.findOne({
        userId: user._id,
        status: 'active',
      }).sort({ updatedAt: -1 });
    }

    if (!membership) {
      return next(new Error('Authentication error: No active organization membership found.'));
    }

    const organization = await Organization.findById(membership.organizationId);
    if (!organization || organization.status !== 'active') {
      return next(new Error('Authentication error: Organization is inactive or suspended.'));
    }

    let patientId = null;
    if (user.role === 'PATIENT' || membership.role === 'PATIENT') {
      const patient = await Patient.findOne({
        userId: user._id,
        organizationId: organization._id,
      });
      if (patient) patientId = patient._id.toString();
    }

    // Attach user profile and verified tenant context to socket instance
    socket.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: membership.role,
      patientId,
    };

    socket.tenant = {
      organizationId: organization._id.toString(),
      organizationObjectId: organization._id,
      membershipId: membership._id.toString(),
      role: membership.role,
      permissions: membership.permissions || [],
    };

    console.log(
      `[Socket Auth] Authenticated socket connection ${socket.id} for ${user.name} (${membership.role}) in Org ${organization.slug}`
    );
    next();
  } catch (error) {
    console.warn(`[Socket Auth Error] Token verification failed for ${socket.id}: ${error.message}`);
    next(new Error(`Authentication error: ${error.message}`));
  }
};

export default socketAuthMiddleware;
