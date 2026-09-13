/**
 * Middleware factory for Role-Based Access Control (RBAC)
 * Usage: requireRole('CLINICIAN', 'ADMIN')
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please authenticate first.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.warn(`[RBAC Access Denied] User ${req.user.email} (${req.user.role}) attempted to access route requiring: ${allowedRoles.join(', ')}`);
      return res.status(403).json({
        success: false,
        message: `Forbidden. Access requires one of the following roles: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
};

export default requireRole;
