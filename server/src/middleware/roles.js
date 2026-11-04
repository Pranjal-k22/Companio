import { AuthenticationError, AuthorizationError } from '../errors/AppError.js';

/**
 * Middleware factory for Role-Based Access Control (RBAC)
 * Usage: requireRole('CLINICIAN', 'ADMIN')
 */
export const requireRole = (...allowedRoles) => {
  const flattened = allowedRoles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Unauthorized. Please authenticate first.'));
    }

    if (!flattened.includes(req.user.role)) {
      console.warn(`[RBAC Access Denied] User ${req.user.email} (${req.user.role}) attempted to access route requiring: ${flattened.join(', ')}`);
      return next(new AuthorizationError(`Forbidden. Access requires one of the following roles: [${flattened.join(', ')}]`));
    }

    next();
  };
};

export const roleCheck = requireRole;
export default requireRole;
