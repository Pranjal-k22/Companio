import mongoose from 'mongoose';
import {
  CaregiverRelationship,
  CaregiverAccessGrant,
  CaregiverAccessEvent,
  Patient,
  ConsentRecord,
} from '../../models/index.js';
import { CAREGIVER_PERMISSION_SCOPES } from '../../models/CaregiverAccessGrant.js';
import { AuthorizationError, NotFoundError } from '../../errors/AppError.js';
import logger from '../../utils/logger.js';

export { CAREGIVER_PERMISSION_SCOPES };

// Actions explicitly prohibited for caregivers
export const PROHIBITED_CAREGIVER_ACTIONS = [
  'prescriptions:modify',
  'diagnoses:create',
  'reports:approve',
  'reports:attest',
  'flags:resolve',
  'flags:dismiss',
  'safety_rules:manage',
  'permissions:delegate',
  'audit:delete',
];

/**
 * Log a caregiver access event for tamper-evident audit trails.
 */
export async function logCaregiverAccessEvent({
  organizationId,
  patientId,
  caregiverUserId,
  relationshipId = null,
  action,
  permissionScope = null,
  resourceType = 'PATIENT',
  resourceId = null,
  outcome = 'ALLOWED',
  denialReason = null,
  req = null,
}) {
  try {
    const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || null;
    const userAgent = req?.headers?.['user-agent'] || null;
    const requestId = req?.id || req?.headers?.['x-request-id'] || null;

    return await CaregiverAccessEvent.create({
      organizationId,
      patientId,
      caregiverUserId,
      relationshipId,
      action,
      permissionScope,
      resourceType,
      resourceId: resourceId ? String(resourceId) : null,
      outcome,
      denialReason,
      ipAddress,
      userAgent,
      requestId,
      timestamp: new Date(),
    });
  } catch (err) {
    logger.error('[Caregiver Audit Error] Failed to log access event:', {
      error: err.message,
      patientId,
      caregiverUserId,
      action,
    });
    return null;
  }
}

/**
 * Retrieve the active CaregiverRelationship and CaregiverAccessGrant for a patient.
 * Validates expiration, active status, and underlying patient consent.
 */
export async function getEffectiveCaregiverGrant(organizationId, caregiverUserId, patientId) {
  if (!organizationId || !caregiverUserId || !patientId) {
    return { authorized: false, reason: 'Missing organization, caregiver, or patient ID' };
  }

  const orgObjectId = new mongoose.Types.ObjectId(organizationId);
  const caregiverObjectId = new mongoose.Types.ObjectId(caregiverUserId);
  const patientObjectId = new mongoose.Types.ObjectId(patientId);

  // 1. Verify patient exists in this organization
  const patient = await Patient.findOne({
    _id: patientObjectId,
    organizationId: orgObjectId,
  });

  if (!patient) {
    return { authorized: false, reason: 'Patient not found in this organization' };
  }

  // 2. Lookup active relationship
  const relationship = await CaregiverRelationship.findOne({
    organizationId: orgObjectId,
    patientId: patientObjectId,
    caregiverUserId: caregiverObjectId,
  });

  if (!relationship) {
    return { authorized: false, reason: 'No caregiver relationship exists for this patient' };
  }

  if (relationship.status !== 'ACTIVE') {
    return { authorized: false, relationship, reason: `Relationship is not active (status: ${relationship.status})` };
  }

  if (relationship.expiresAt && new Date() > relationship.expiresAt) {
    return { authorized: false, relationship, reason: 'Caregiver relationship authorization has expired' };
  }

  // 3. Lookup active grant
  const grant = await CaregiverAccessGrant.findOne({
    organizationId: orgObjectId,
    patientId: patientObjectId,
    caregiverRelationshipId: relationship._id,
    status: 'ACTIVE',
  }).sort({ createdAt: -1 });

  if (!grant) {
    return { authorized: false, relationship, reason: 'No active caregiver access grant found' };
  }

  const now = new Date();
  if (grant.expiresAt && now > grant.expiresAt) {
    return { authorized: false, relationship, grant, reason: 'Caregiver access grant has expired' };
  }

  if (grant.effectiveFrom && now < grant.effectiveFrom) {
    return { authorized: false, relationship, grant, reason: 'Caregiver access grant is not yet effective' };
  }

  // 4. Invariant: Caregiver grant must never override withdrawn patient consent
  // If patient has an explicitly WITHDRAWN CLINICIAN_SHARING consent, check if still permitted
  const withdrawnConsent = await ConsentRecord.findOne({
    organizationId: orgObjectId,
    patientId: patientObjectId,
    purpose: 'CLINICIAN_SHARING',
  }).sort({ createdAt: -1 });

  if (withdrawnConsent && withdrawnConsent.decision === 'WITHDRAWN') {
    return {
      authorized: false,
      relationship,
      grant,
      reason: 'Underlying patient consent for information sharing has been withdrawn',
    };
  }

  return {
    authorized: true,
    patient,
    relationship,
    grant,
    scopes: grant.permissionScopes || [],
  };
}

/**
 * Check if a caregiver possesses a specific granular permission scope.
 */
export async function checkCaregiverPermission(organizationId, caregiverUserId, patientId, requiredScope) {
  const result = await getEffectiveCaregiverGrant(organizationId, caregiverUserId, patientId);
  if (!result.authorized) {
    return result;
  }

  if (!result.scopes.includes(requiredScope)) {
    return {
      authorized: false,
      patient: result.patient,
      relationship: result.relationship,
      grant: result.grant,
      reason: `Caregiver lacks required granular scope: ${requiredScope}`,
    };
  }

  return result;
}

/**
 * Express middleware factory: Enforces granular scope check on every incoming caregiver request.
 * Automatically logs access events and attaches verified patient, relationship, and grant to req.
 */
export function requireCaregiverScope(requiredScope, patientIdParam = 'patientId') {
  return async (req, res, next) => {
    try {
      const caregiverUserId = req.user?.id || req.user?._id;
      const organizationId = req.tenant?.organizationId || req.tenant?.organizationObjectId;

      const patientId =
        req.params[patientIdParam] ||
        req.params.id ||
        req.query.patientId ||
        req.body?.patientId;

      if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
        return next(new NotFoundError('Valid patient identifier is required for caregiver access.'));
      }

      // Check permission
      const check = await checkCaregiverPermission(
        organizationId,
        caregiverUserId,
        patientId,
        requiredScope
      );

      if (!check.authorized) {
        // Log access denial
        await logCaregiverAccessEvent({
          organizationId,
          patientId,
          caregiverUserId,
          relationshipId: check.relationship?._id || null,
          action: 'ACCESS_DENIED',
          permissionScope: requiredScope,
          resourceType: 'PATIENT',
          resourceId: patientId,
          outcome: 'DENIED',
          denialReason: check.reason,
          req,
        });

        logger.warn('[Caregiver Scope Denied]', {
          caregiverUserId,
          patientId,
          requiredScope,
          reason: check.reason,
          requestId: req.id,
        });

        return next(new AuthorizationError(`Caregiver access denied: ${check.reason}`));
      }

      // Attach context to request
      req.patient = check.patient;
      req.caregiverRelationship = check.relationship;
      req.caregiverGrant = check.grant;

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Retrieve patient-facing access history (who viewed the patient's record).
 */
export async function getPatientCaregiverAccessHistory(organizationId, patientId, { page = 1, limit = 20 } = {}) {
  const query = {
    organizationId: new mongoose.Types.ObjectId(organizationId),
    patientId: new mongoose.Types.ObjectId(patientId),
  };

  const skip = (page - 1) * limit;

  const [events, total] = await Promise.all([
    CaregiverAccessEvent.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('caregiverUserId', 'name email role')
      .populate('relationshipId', 'relationshipType relationshipLabel')
      .lean(),
    CaregiverAccessEvent.countDocuments(query),
  ]);

  return {
    events,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Retrieve caregiver-facing audit history (events performed by this caregiver).
 */
export async function getCaregiverOwnAccessHistory(organizationId, caregiverUserId, { page = 1, limit = 20 } = {}) {
  const query = {
    organizationId: new mongoose.Types.ObjectId(organizationId),
    caregiverUserId: new mongoose.Types.ObjectId(caregiverUserId),
  };

  const skip = (page - 1) * limit;

  const [events, total] = await Promise.all([
    CaregiverAccessEvent.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('patientId', 'name age')
      .lean(),
    CaregiverAccessEvent.countDocuments(query),
  ]);

  return {
    events,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export default {
  CAREGIVER_PERMISSION_SCOPES,
  PROHIBITED_CAREGIVER_ACTIONS,
  logCaregiverAccessEvent,
  getEffectiveCaregiverGrant,
  checkCaregiverPermission,
  requireCaregiverScope,
  getPatientCaregiverAccessHistory,
  getCaregiverOwnAccessHistory,
};
