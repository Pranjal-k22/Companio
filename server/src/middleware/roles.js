import { AuthenticationError, AuthorizationError } from '../errors/AppError.js';

/**
 * Middleware factory for Role-Based Access Control (RBAC)
 * Usage: requireRole('CLINICIAN', 'ADMIN')
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Unauthorized. Please authenticate first.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.warn(`[RBAC Access Denied] User ${req.user.email} (${req.user.role}) attempted to access route requiring: ${allowedRoles.join(', ')}`);
      return next(new AuthorizationError(`Forbidden. Access requires one of the following roles: [${allowedRoles.join(', ')}]`));
    }

    next();
  };
};

export const roleCheck = requireRole;
export default requireRole;
