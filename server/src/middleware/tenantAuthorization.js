import mongoose from 'mongoose';
import { Patient, Team } from '../models/index.js';
import { AuthorizationError, NotFoundError } from '../errors/AppError.js';
import { PERMISSIONS } from '../constants/permissions.js';
import logger from '../utils/logger.js';

/**
 * Middleware factory requiring specific organization-level permissions.
 *
 * @param  {...string} requiredPermissions - Permissions required to access this endpoint
 */
export function requirePermission(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.tenant) {
      return next(new AuthorizationError('Tenant context missing. Unable to verify permissions.'));
    }

    // ORG_OWNER has all permissions implicitly
    if (req.tenant.role === 'ORG_OWNER') {
      return next();
    }

    const userPermissions = new Set(req.tenant.permissions || []);
    const hasAll = requiredPermissions.every((perm) => userPermissions.has(perm));

    if (!hasAll) {
      logger.warn('[Authorization Denied] Missing required permission', {
        userId: req.user?.id,
        role: req.tenant.role,
        required: requiredPermissions,
        granted: req.tenant.permissions,
        requestId: req.id,
      });
      return next(
        new AuthorizationError(`Access denied. Missing required permission: [${requiredPermissions.join(', ')}]`)
      );
    }

    next();
  };
}

/**
 * Middleware ensuring caller has care-team assignment, administrative coverage,
 * or self-ownership for the requested patient.
 *
 * Scopes lookup strictly to req.tenant.organizationId to prevent cross-tenant enumeration.
 * Attaches the validated patient document to req.patient for downstream controller use.
 *
 * @param {string} patientIdParam - Parameter name in req.params or req.body (default: 'id')
 */
export function requireCareTeamOrSelf(patientIdParam = 'id') {
  return async (req, res, next) => {
    try {
      if (!req.tenant) {
        return next(new AuthorizationError('Tenant context required for patient authorization.'));
      }

      // 1. Extract patientId from params, query, or body
      const patientId =
        req.params[patientIdParam] ||
        req.params.patientId ||
        req.query.patientId ||
        req.body?.patientId;

      if (!patientId) {
        return next(new NotFoundError('Patient identifier parameter is required.'));
      }

      if (!mongoose.Types.ObjectId.isValid(patientId)) {
        return next(new NotFoundError('Invalid patient identifier.'));
      }

      // 2. Fetch patient strictly scoped to current organization
      const patient = await Patient.findOne({
        _id: new mongoose.Types.ObjectId(patientId),
        organizationId: req.tenant.organizationObjectId,
      });

      // Conceal cross-tenant existence: return 404 if not found in this organization
      if (!patient) {
        logger.warn('[Cross-Tenant or Missing Patient Access Attempt]', {
          patientId,
          requestedOrg: req.tenant.organizationId,
          caller: req.user?.email,
          requestId: req.id,
        });
        return next(new NotFoundError('Patient record not found in this organization.'));
      }

      // 3. Authorization check based on caller's role
      const role = req.tenant.role;
      const userId = req.user.id;

      // 3.1 Patient Self-Access
      if (role === 'PATIENT') {
        if (!patient.userId || patient.userId.toString() !== userId) {
          logger.warn('[Patient Unauthorized Record Access Denied]', {
            callerUserId: userId,
            targetPatientUserId: patient.userId?.toString(),
            requestId: req.id,
          });
          return next(new AuthorizationError('Patients may only access their own clinical health records.'));
        }
        req.patient = patient;
        return next();
      }

      // 3.2 Organization Owner or Administrator with broad patient read permission
      if (
        role === 'ORG_OWNER' ||
        role === 'ORG_ADMIN' ||
        req.tenant.permissions.includes(PERMISSIONS.PATIENTS_READ_ALL)
      ) {
        req.patient = patient;
        return next();
      }

      // 3.3 Clinician Care-Team Assignment
      if (role === 'CLINICIAN' || role === 'CARE_COORDINATOR') {
        const isDirectlyAssigned =
          patient.assignedClinicianId &&
          patient.assignedClinicianId.toString() === userId;

        if (isDirectlyAssigned) {
          req.patient = patient;
          return next();
        }

        // Check if clinician belongs to a care team assigned to this patient's department
        if (req.tenant.teamIds && req.tenant.teamIds.length > 0) {
          const teamAssigned = await Team.exists({
            _id: { $in: req.tenant.teamIds },
            organizationId: req.tenant.organizationObjectId,
            clinicianMembershipIds: req.tenant.membershipId,
          });
          if (teamAssigned) {
            req.patient = patient;
            return next();
          }
        }

        logger.warn('[Clinician Unassigned Patient Access Denied]', {
          clinicianUserId: userId,
          patientId: patient._id.toString(),
          assignedClinicianId: patient.assignedClinicianId?.toString(),
          requestId: req.id,
        });
        return next(
          new AuthorizationError(
            'Access denied. You are not assigned to this patient and lack organization-wide coverage permissions.'
          )
        );
      }

      // 3.4 Caregiver Delegated Access
      if (role === 'CAREGIVER') {
        const isAuthorizedCaregiver =
          patient.emergencyContact?.email?.toLowerCase() === req.user.email.toLowerCase() ||
          patient.emergencyContact?.name?.toLowerCase().includes(req.user.name.toLowerCase());

        if (isAuthorizedCaregiver) {
          req.patient = patient;
          return next();
        }

        return next(new AuthorizationError('You do not possess an active caregiver authorization grant for this patient.'));
      }

      // Default reject
      return next(new AuthorizationError('You are not authorized to view or modify this patient record.'));
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Utility helper returning a MongoDB filter scoped by the request's organizationId
 */
export function tenantFilter(req, query = {}) {
  if (!req.tenant || !req.tenant.organizationObjectId) {
    throw new Error('Tenant context missing. Unable to construct tenant-scoped query.');
  }
  return {
    ...query,
    organizationId: req.tenant.organizationObjectId,
  };
}

export default {
  requirePermission,
  requireCareTeamOrSelf,
  tenantFilter,
};

