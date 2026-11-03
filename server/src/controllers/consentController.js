import consentService from '../services/consentService.js';
import privacyService from '../services/privacyService.js';
import { sendSuccess } from '../utils/response.js';
import { ValidationError, AuthorizationError } from '../errors/AppError.js';
import { PERMISSIONS } from '../constants/permissions.js';

/**
 * Get effective consent summary and chronological audit trail for a patient.
 */
export async function getPatientConsents(req, res, next) {
  try {
    const orgId = req.tenant.organizationObjectId;
    const { patientId } = req.params;

    const [effective, history] = await Promise.all([
      consentService.getEffectiveConsent(orgId, patientId),
      consentService.getConsentHistory(orgId, patientId),
    ]);

    return sendSuccess(
      res,
      {
        effectiveConsent: effective,
        auditTrail: history,
      },
      {
        legacyKey: 'effectiveConsent',
        message: 'Patient consent status retrieved successfully.',
      }
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Record a new consent decision (or batch decisions) for a patient.
 * Appends immutable ConsentRecord(s) and recalculates effective consent.
 */
export async function updatePatientConsent(req, res, next) {
  try {
    const orgId = req.tenant.organizationObjectId;
    const { patientId } = req.params;
    const { purpose, decision, decisions, noticeVersion, channel, notes } = req.body;

    const actorId = req.user.id || req.user._id;
    const actorRole = req.tenant?.role || req.user.role || 'PATIENT';
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    let records = [];

    if (decisions && Array.isArray(decisions)) {
      records = await consentService.recordBatchConsent({
        organizationId: orgId,
        patientId,
        decisions,
        noticeVersion,
        channel: channel || 'WEB_PORTAL',
        actorId,
        actorRole,
        ipAddress,
        userAgent,
        notes,
      });
    } else if (purpose && decision) {
      const rec = await consentService.recordConsent({
        organizationId: orgId,
        patientId,
        purpose,
        decision,
        noticeVersion,
        channel: channel || 'WEB_PORTAL',
        actorId,
        actorRole,
        ipAddress,
        userAgent,
        notes,
      });
      records = [rec];
    } else {
      throw new ValidationError('Either (purpose, decision) or decisions array must be provided.');
    }

    const updatedEffective = await consentService.getEffectiveConsent(orgId, patientId);

    return sendSuccess(
      res,
      {
        recordsCreated: records.length,
        records,
        effectiveConsent: updatedEffective,
      },
      {
        statusCode: 201,
        legacyKey: 'effectiveConsent',
        message: 'Consent decision recorded successfully.',
      }
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Convenience endpoint to withdraw consent for specific purposes or all purposes.
 */
export async function withdrawPatientConsent(req, res, next) {
  try {
    const orgId = req.tenant.organizationObjectId;
    const { patientId } = req.params;
    const { purposes, notes } = req.body;

    const actorId = req.user.id || req.user._id;
    const actorRole = req.tenant?.role || req.user.role || 'PATIENT';
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    let records = [];

    if (purposes && Array.isArray(purposes) && purposes.length > 0) {
      const decisions = purposes.map((p) => ({ purpose: p, decision: 'WITHDRAWN' }));
      records = await consentService.recordBatchConsent({
        organizationId: orgId,
        patientId,
        decisions,
        channel: 'WEB_PORTAL',
        actorId,
        actorRole,
        ipAddress,
        userAgent,
        notes: notes || 'Consent withdrawn by user request.',
      });
    } else {
      records = await consentService.withdrawAllConsent(orgId, patientId, {
        actorId,
        actorRole,
        channel: 'WEB_PORTAL',
        notes: notes || 'All consents withdrawn by user request.',
      });
    }

    const updatedEffective = await consentService.getEffectiveConsent(orgId, patientId);

    return sendSuccess(
      res,
      {
        recordsCreated: records.length,
        records,
        effectiveConsent: updatedEffective,
      },
      {
        legacyKey: 'effectiveConsent',
        message: 'Consent withdrawal recorded successfully.',
      }
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Data Subject Access Request (DSAR) - Export all patient data in HIPAA/GDPR sanitized bundle.
 */
export async function exportPatientDataHandler(req, res, next) {
  try {
    const orgId = req.tenant.organizationObjectId;
    const { patientId } = req.params;

    const exportBundle = await privacyService.exportPatientData(orgId, patientId);

    return sendSuccess(res, exportBundle, {
      legacyKey: 'exportMetadata',
      message: 'Patient data export generated successfully.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Right to Erasure / Anonymization - Redact patient demographics and revoke all consents.
 */
export async function anonymizePatientHandler(req, res, next) {
  try {
    const orgId = req.tenant.organizationObjectId;
    const { patientId } = req.params;
    const { reason } = req.body;

    const isAuthorized =
      req.tenant.role === 'ORG_OWNER' ||
      req.tenant.role === 'ORG_ADMIN' ||
      req.tenant.permissions.includes(PERMISSIONS.PATIENTS_ARCHIVE) ||
      req.tenant.permissions.includes(PERMISSIONS.PRIVACY_ANONYMIZE);

    if (!isAuthorized) {
      throw new AuthorizationError('You do not have permission to anonymize patient health records.');
    }

    const actorId = req.user.id || req.user._id;
    const actorRole = req.tenant?.role || req.user.role || 'ORG_ADMIN';

    const anonymizedPatient = await privacyService.anonymizePatient(orgId, patientId, {
      actorId,
      actorRole,
      reason,
    });

    return sendSuccess(
      res,
      {
        patient: anonymizedPatient,
        anonymized: true,
      },
      {
        legacyKey: 'patient',
        message: 'Patient demographic data anonymized and all consents revoked.',
      }
    );
  } catch (error) {
    next(error);
  }
}

export default {
  getPatientConsents,
  updatePatientConsent,
  withdrawPatientConsent,
  exportPatientDataHandler,
  anonymizePatientHandler,
};
