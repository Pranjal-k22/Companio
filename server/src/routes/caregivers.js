import express from 'express';
import mongoose from 'mongoose';
import {
  CaregiverRelationship,
  CaregiverAccessGrant,
  CaregiverConcern,
  Patient,
  Checkin,
  Appointment,
  Report,
  Observation,
} from '../models/index.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { validateRequest } from '../middleware/validate.js';
import {
  requireCaregiverScope,
  checkCaregiverPermission,
  logCaregiverAccessEvent,
  getPatientCaregiverAccessHistory,
  getCaregiverOwnAccessHistory,
} from '../services/caregivers/caregiverPermissionService.js';
import {
  createCaregiverInvitation,
  acceptCaregiverInvitation,
  revokeCaregiverRelationship,
} from '../services/caregivers/caregiverInvitationService.js';
import {
  submitCaregiverConcern,
  listCaregiverConcerns,
} from '../services/caregivers/caregiverConcernService.js';
import {
  startAssistedDialogueSession,
  endAssistedDialogueSession,
} from '../services/caregivers/caregiverVoiceService.js';
import {
  createCaregiverInvitationSchema,
  acceptCaregiverInvitationSchema,
  updateCaregiverGrantSchema,
  revokeCaregiverAccessSchema,
  submitCaregiverConcernSchema,
  assistedVoiceSessionSchema,
  endAssistedVoiceSessionSchema,
} from '../validators/caregiver.schemas.js';
import { NotFoundError, AuthorizationError, ValidationError } from '../errors/AppError.js';

const router = express.Router();

// Apply global auth and tenant context across all caregiver routes
router.use(verifyToken);
router.use(tenantContext);

// =========================================================================
// 1. CAREGIVER RELATIONSHIPS & INVITATIONS
// =========================================================================

/**
 * GET /api/v1/patients/:patientId/caregivers
 * List all caregivers and pending invitations linked to a patient.
 */
router.get('/patients/:patientId/caregivers', async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const orgId = req.tenant.organizationObjectId;

    // Verify patient access (Patient self, Clinician, or Admin)
    const patient = await Patient.findOne({ _id: patientId, organizationId: orgId });
    if (!patient) {
      throw new NotFoundError('Patient not found in this organization.');
    }

    if (
      req.tenant.role === 'PATIENT' &&
      patient.userId &&
      patient.userId.toString() !== (req.user.id || req.user._id).toString()
    ) {
      throw new AuthorizationError('You may only view caregivers for your own health record.');
    }

    const relationships = await CaregiverRelationship.find({
      organizationId: orgId,
      patientId,
    })
      .populate('caregiverUserId', 'name email phone role')
      .populate('invitedBy', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    // Populate active grants for each relationship
    const relIds = relationships.map((r) => r._id);
    const grants = await CaregiverAccessGrant.find({
      caregiverRelationshipId: { $in: relIds },
      status: 'ACTIVE',
    }).lean();

    const grantsByRel = {};
    for (const g of grants) {
      grantsByRel[g.caregiverRelationshipId.toString()] = g;
    }

    const data = relationships.map((r) => ({
      ...r,
      activeGrant: grantsByRel[r._id.toString()] || null,
    }));

    res.json({
      success: true,
      data,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/patients/:patientId/caregivers/invitations
 * Create a new caregiver invitation initiated by patient or authorized representative.
 */
router.post(
  '/patients/:patientId/caregivers/invitations',
  validateRequest(createCaregiverInvitationSchema),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const orgId = req.tenant.organizationObjectId;
      const userId = req.user.id || req.user._id;

      const patient = await Patient.findOne({ _id: patientId, organizationId: orgId });
      if (!patient) {
        throw new NotFoundError('Patient not found in this organization.');
      }

      if (
        req.tenant.role === 'PATIENT' &&
        patient.userId &&
        patient.userId.toString() !== userId.toString()
      ) {
        throw new AuthorizationError('Patients may only invite caregivers to their own record.');
      }

      const result = await createCaregiverInvitation({
        organizationId: orgId,
        patientId,
        invitedByUserId: userId,
        invitationEmail: req.body.invitationEmail,
        invitationPhone: req.body.invitationPhone,
        relationshipType: req.body.relationshipType,
        relationshipLabel: req.body.relationshipLabel,
        authorizationType: req.body.authorizationType,
        legalAuthorityVerification: req.body.legalAuthorityVerification,
        initialScopes: req.body.initialScopes,
        expiresInDays: req.body.expiresInDays,
        req,
      });

      res.status(201).json({
        success: true,
        data: {
          relationship: result.relationship,
          grant: result.grant,
          invitationToken: result.rawToken,
          expiresAt: result.expiresAt,
        },
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/caregivers/invitations
 * List pending invitations for the logged-in caregiver's email/phone.
 */
router.get('/caregivers/invitations', async (req, res, next) => {
  try {
    const userEmail = req.user.email ? req.user.email.toLowerCase() : '';
    const userPhone = req.user.phone ? req.user.phone.trim() : '';

    const query = {
      organizationId: req.tenant.organizationObjectId,
      status: 'INVITED',
      $or: [],
    };

    if (userEmail) query.$or.push({ invitationEmail: userEmail });
    if (userPhone) query.$or.push({ invitationPhone: userPhone });

    if (query.$or.length === 0) {
      return res.json({
        success: true,
        data: [],
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    }

    const invitations = await CaregiverRelationship.find(query)
      .populate('patientId', 'name age')
      .populate('invitedBy', 'name role')
      .sort({ invitedAt: -1 })
      .lean();

    res.json({
      success: true,
      data: invitations,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/caregivers/invitations/:id/accept
 * Caregiver accepts invitation using single-use raw token.
 */
router.post(
  '/caregivers/invitations/:id/accept',
  validateRequest(acceptCaregiverInvitationSchema),
  async (req, res, next) => {
    try {
      const caregiverUserId = req.user.id || req.user._id;
      const rawToken = req.body.token;

      const result = await acceptCaregiverInvitation({
        rawToken,
        caregiverUserId,
        req,
      });

      res.json({
        success: true,
        data: result,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/caregivers/invitations/:id/revoke
 * Revoke a caregiver invitation or active relationship.
 */
router.post(
  '/caregivers/invitations/:id/revoke',
  validateRequest(revokeCaregiverAccessSchema),
  async (req, res, next) => {
    try {
      const { id: relationshipId } = req.params;
      const orgId = req.tenant.organizationObjectId;
      const userId = req.user.id || req.user._id;

      const relationship = await revokeCaregiverRelationship({
        organizationId: orgId,
        relationshipId,
        revokedByUserId: userId,
        revocationReason: req.body.revocationReason,
        req,
      });

      res.json({
        success: true,
        data: relationship,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/caregiver/relationships
 * List all patient relationships linked to the authenticated caregiver.
 */
router.get('/caregiver/relationships', async (req, res, next) => {
  try {
    const caregiverUserId = req.user.id || req.user._id;
    const orgId = req.tenant.organizationObjectId;

    const relationships = await CaregiverRelationship.find({
      organizationId: orgId,
      caregiverUserId,
    })
      .populate('patientId', 'name age contact')
      .sort({ status: 1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: relationships,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// 2. ACCESS GRANTS MANAGEMENT
// =========================================================================

/**
 * GET /api/v1/patients/:patientId/caregiver-access
 * List active and historical permission grants for a patient.
 */
router.get('/patients/:patientId/caregiver-access', async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const orgId = req.tenant.organizationObjectId;

    const grants = await CaregiverAccessGrant.find({
      organizationId: orgId,
      patientId,
    })
      .populate('caregiverRelationshipId', 'relationshipType relationshipLabel status caregiverUserId')
      .populate('grantedBy', 'name role')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: grants,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/patients/:patientId/caregiver-access
 * Create a new permission grant for a linked caregiver relationship.
 */
router.post('/patients/:patientId/caregiver-access', async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const orgId = req.tenant.organizationObjectId;
    const userId = req.user.id || req.user._id;
    const { caregiverRelationshipId, permissionScopes, authorizationType, expiresAt } = req.body;

    if (!caregiverRelationshipId || !Array.isArray(permissionScopes)) {
      throw new ValidationError('caregiverRelationshipId and permissionScopes array are required.');
    }

    const grant = await CaregiverAccessGrant.create({
      organizationId: orgId,
      patientId,
      caregiverRelationshipId,
      permissionScopes,
      authorizationType: authorizationType || 'PATIENT_AUTHORIZED',
      grantedBy: userId,
      status: 'ACTIVE',
      effectiveFrom: new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    await logCaregiverAccessEvent({
      organizationId: orgId,
      patientId,
      caregiverUserId: userId,
      relationshipId: caregiverRelationshipId,
      action: 'PERMISSION_GRANTED',
      permissionScope: permissionScopes.join(','),
      outcome: 'ALLOWED',
      req,
    });

    res.status(201).json({
      success: true,
      data: grant,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/caregiver-access/:grantId
 * Update permission scopes or expiration of an existing grant.
 */
router.patch(
  '/caregiver-access/:grantId',
  validateRequest(updateCaregiverGrantSchema),
  async (req, res, next) => {
    try {
      const { grantId } = req.params;
      const orgId = req.tenant.organizationObjectId;

      const grant = await CaregiverAccessGrant.findOne({
        _id: grantId,
        organizationId: orgId,
      });

      if (!grant) {
        throw new NotFoundError('Caregiver access grant not found in this organization.');
      }

      if (req.body.permissionScopes) {
        grant.permissionScopes = req.body.permissionScopes;
      }
      if (req.body.status) {
        grant.status = req.body.status;
      }
      if (req.body.expiresAt !== undefined) {
        grant.expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
      }

      await grant.save();

      await logCaregiverAccessEvent({
        organizationId: orgId,
        patientId: grant.patientId,
        caregiverUserId: req.user.id || req.user._id,
        relationshipId: grant.caregiverRelationshipId,
        action: 'PERMISSION_GRANTED',
        permissionScope: grant.permissionScopes.join(','),
        outcome: 'ALLOWED',
        req,
      });

      res.json({
        success: true,
        data: grant,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/caregiver-access/:grantId/revoke
 * Immediately revoke a caregiver grant.
 */
router.post(
  '/caregiver-access/:grantId/revoke',
  validateRequest(revokeCaregiverAccessSchema),
  async (req, res, next) => {
    try {
      const { grantId } = req.params;
      const orgId = req.tenant.organizationObjectId;

      const grant = await CaregiverAccessGrant.findOne({
        _id: grantId,
        organizationId: orgId,
      });

      if (!grant) {
        throw new NotFoundError('Caregiver access grant not found in this organization.');
      }

      grant.status = 'REVOKED';
      grant.revokedAt = new Date();
      grant.revocationReason = req.body.revocationReason;
      await grant.save();

      await logCaregiverAccessEvent({
        organizationId: orgId,
        patientId: grant.patientId,
        caregiverUserId: req.user.id || req.user._id,
        relationshipId: grant.caregiverRelationshipId,
        action: 'PERMISSION_REVOKED',
        outcome: 'ALLOWED',
        denialReason: req.body.revocationReason,
        req,
      });

      res.json({
        success: true,
        data: grant,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/caregiver-access/:grantId/history
 * View versioned history of grant updates.
 */
router.get('/caregiver-access/:grantId/history', async (req, res, next) => {
  try {
    const { grantId } = req.params;
    const orgId = req.tenant.organizationObjectId;

    const grant = await CaregiverAccessGrant.findOne({
      _id: grantId,
      organizationId: orgId,
    });

    if (!grant) {
      throw new NotFoundError('Grant not found.');
    }

    // Find linked previous grants in chain
    const chain = [grant];
    let current = grant;
    while (current && current.previousGrantId) {
      const prev = await CaregiverAccessGrant.findById(current.previousGrantId).lean();
      if (prev) {
        chain.push(prev);
        current = prev;
      } else {
        break;
      }
    }

    res.json({
      success: true,
      data: chain,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// 3. CAREGIVER PORTAL VIEWS (GRANULAR SCOPES REQUIRED)
// =========================================================================

/**
 * GET /api/v1/caregiver/patients
 * List all patients for whom the caregiver has active authorization.
 */
router.get('/caregiver/patients', async (req, res, next) => {
  try {
    const caregiverUserId = req.user.id || req.user._id;
    const orgId = req.tenant.organizationObjectId;

    // Find all ACTIVE relationships for this caregiver
    const relationships = await CaregiverRelationship.find({
      organizationId: orgId,
      caregiverUserId,
      status: 'ACTIVE',
    })
      .populate('patientId', 'name age contact baselineMetrics')
      .lean();

    const relIds = relationships.map((r) => r._id);
    const activeGrants = await CaregiverAccessGrant.find({
      caregiverRelationshipId: { $in: relIds },
      status: 'ACTIVE',
    }).lean();

    const grantsMap = {};
    for (const g of activeGrants) {
      grantsMap[g.caregiverRelationshipId.toString()] = g;
    }

    const data = relationships
      .filter((r) => r.patientId && grantsMap[r._id.toString()])
      .map((r) => ({
        relationshipId: r._id,
        relationshipType: r.relationshipType,
        relationshipLabel: r.relationshipLabel,
        patient: {
          id: r.patientId._id,
          name: r.patientId.name,
          age: r.patientId.age,
        },
        permissions: grantsMap[r._id.toString()].permissionScopes,
        grantedAt: grantsMap[r._id.toString()].grantedAt,
        expiresAt: grantsMap[r._id.toString()].expiresAt,
      }));

    res.json({
      success: true,
      data,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/caregiver/patients/:patientId/overview
 * High-level patient wellness summary. Requires WELLNESS_SUMMARY_READ.
 */
router.get(
  '/caregiver/patients/:patientId/overview',
  requireCaregiverScope('WELLNESS_SUMMARY_READ'),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const orgId = req.tenant.organizationObjectId;

      const patient = req.patient;

      // Fetch latest completed checkin
      const latestCheckin = await Checkin.findOne({
        patientId,
        organizationId: orgId,
      })
        .sort({ createdAt: -1 })
        .lean();

      // Fetch next upcoming appointment if APPOINTMENT_READ scope present
      let nextAppointment = null;
      if (req.caregiverGrant?.permissionScopes?.includes('APPOINTMENT_READ')) {
        nextAppointment = await Appointment.findOne({
          patientId,
          organizationId: orgId,
          dateTime: { $gte: new Date() },
          status: { $in: ['scheduled', 'confirmed'] },
        })
          .sort({ dateTime: 1 })
          .lean();
      }

      await logCaregiverAccessEvent({
        organizationId: orgId,
        patientId,
        caregiverUserId: req.user.id || req.user._id,
        relationshipId: req.caregiverRelationship._id,
        action: 'VIEW_WELLNESS_SUMMARY',
        permissionScope: 'WELLNESS_SUMMARY_READ',
        resourceType: 'PATIENT',
        resourceId: patientId,
        outcome: 'ALLOWED',
        req,
      });

      res.json({
        success: true,
        data: {
          patient: {
            id: patient._id,
            preferredName: patient.name,
            age: patient.age,
          },
          relationship: {
            label: req.caregiverRelationship.relationshipLabel,
            type: req.caregiverRelationship.relationshipType,
          },
          lastCheckin: latestCheckin
            ? {
                date: latestCheckin.createdAt,
                status: latestCheckin.status || 'COMPLETED',
                mood: latestCheckin.mood || 'Good',
                summary: latestCheckin.summary || 'Patient completed daily check-in.',
              }
            : null,
          nextAppointment: nextAppointment
            ? {
                doctorName: nextAppointment.doctorName,
                specialty: nextAppointment.specialty,
                dateTime: nextAppointment.dateTime,
                clinicLocation: nextAppointment.clinicLocation,
              }
            : null,
          scopes: req.caregiverGrant.permissionScopes,
          dataLastUpdated: new Date().toISOString(),
        },
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/caregiver/patients/:patientId/checkins
 * Check-in completion history. Requires CHECKIN_HISTORY_READ.
 */
router.get(
  '/caregiver/patients/:patientId/checkins',
  requireCaregiverScope('CHECKIN_HISTORY_READ'),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const orgId = req.tenant.organizationObjectId;
      const limit = Number(req.query.limit) || 10;

      const checkins = await Checkin.find({
        patientId,
        organizationId: orgId,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('createdAt status mood summary confirmedByPatient')
        .lean();

      await logCaregiverAccessEvent({
        organizationId: orgId,
        patientId,
        caregiverUserId: req.user.id || req.user._id,
        relationshipId: req.caregiverRelationship._id,
        action: 'VIEW_CHECKIN_HISTORY',
        permissionScope: 'CHECKIN_HISTORY_READ',
        resourceType: 'CHECKIN',
        outcome: 'ALLOWED',
        req,
      });

      res.json({
        success: true,
        data: checkins,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/caregiver/patients/:patientId/appointments
 * Permitted appointments. Requires APPOINTMENT_READ.
 */
router.get(
  '/caregiver/patients/:patientId/appointments',
  requireCaregiverScope('APPOINTMENT_READ'),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const orgId = req.tenant.organizationObjectId;

      const appointments = await Appointment.find({
        patientId,
        organizationId: orgId,
      })
        .sort({ dateTime: 1 })
        .select('doctorName specialty clinicLocation dateTime durationMinutes type status reasonForVisit')
        .lean();

      await logCaregiverAccessEvent({
        organizationId: orgId,
        patientId,
        caregiverUserId: req.user.id || req.user._id,
        relationshipId: req.caregiverRelationship._id,
        action: 'VIEW_APPOINTMENT',
        permissionScope: 'APPOINTMENT_READ',
        resourceType: 'APPOINTMENT',
        outcome: 'ALLOWED',
        req,
      });

      res.json({
        success: true,
        data: appointments,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/caregiver/patients/:patientId/medications
 * Medication schedule & adherence. Requires MEDICATION_SCHEDULE_READ or MEDICATION_ADHERENCE_READ.
 */
router.get('/caregiver/patients/:patientId/medications', async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const orgId = req.tenant.organizationObjectId;
    const caregiverUserId = req.user.id || req.user._id;

    // Must have at least one of the two medication scopes
    const hasScheduleScope = await checkCaregiverPermission(orgId, caregiverUserId, patientId, 'MEDICATION_SCHEDULE_READ');
    const hasAdherenceScope = await checkCaregiverPermission(orgId, caregiverUserId, patientId, 'MEDICATION_ADHERENCE_READ');

    if (!hasScheduleScope.authorized && !hasAdherenceScope.authorized) {
      await logCaregiverAccessEvent({
        organizationId: orgId,
        patientId,
        caregiverUserId,
        action: 'ACCESS_DENIED',
        permissionScope: 'MEDICATION_SCHEDULE_READ',
        outcome: 'DENIED',
        denialReason: 'Lacks medication read scopes',
        req,
      });
      throw new AuthorizationError('You lack permission to view this patient’s medication schedule or adherence.');
    }

    const patient = await Patient.findOne({ _id: patientId, organizationId: orgId });
    if (!patient) {
      throw new NotFoundError('Patient record not found.');
    }

    const responseData = {};

    // If MEDICATION_SCHEDULE_READ is granted, return prescribed schedule
    if (hasScheduleScope.authorized) {
      responseData.medications = patient.medications || [];
    }

    // If MEDICATION_ADHERENCE_READ is granted, compute adherence from recent observations
    if (hasAdherenceScope.authorized) {
      const adherenceObs = await Observation.find({
        patientId,
        organizationId: orgId,
        observationCode: 'MED_ADHERENCE',
        status: { $nin: ['RETRACTED'] },
      })
        .sort({ effectiveDateTime: -1 })
        .limit(14)
        .lean();

      let takenCount = 0;
      let missedCount = 0;
      for (const obs of adherenceObs) {
        if (obs.valueBoolean === true || obs.valueString === 'taken') takenCount++;
        if (obs.valueBoolean === false || obs.valueString === 'missed') missedCount++;
      }
      const total = takenCount + missedCount;
      const rate = total > 0 ? Math.round((takenCount / total) * 100) : null;

      responseData.adherence = {
        adherenceRate: rate,
        dosesTaken: takenCount,
        dosesMissed: missedCount,
        recordedDays: adherenceObs.length,
      };
    }

    await logCaregiverAccessEvent({
      organizationId: orgId,
      patientId,
      caregiverUserId,
      relationshipId: hasScheduleScope.relationship?._id || hasAdherenceScope.relationship?._id,
      action: 'VIEW_MEDICATION_SCHEDULE',
      permissionScope: 'MEDICATION_SCHEDULE_READ',
      resourceType: 'MEDICATION',
      outcome: 'ALLOWED',
      req,
    });

    res.json({
      success: true,
      data: responseData,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/caregiver/patients/:patientId/concerns
 * Submit a caregiver concern. Requires CONCERN_SUBMIT.
 */
router.post(
  '/caregiver/patients/:patientId/concerns',
  requireCaregiverScope('CONCERN_SUBMIT'),
  validateRequest(submitCaregiverConcernSchema),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const orgId = req.tenant.organizationObjectId;
      const caregiverUserId = req.user.id || req.user._id;

      const result = await submitCaregiverConcern({
        organizationId: orgId,
        patientId,
        caregiverUserId,
        relationshipId: req.caregiverRelationship._id,
        category: req.body.category,
        description: req.body.description,
        observedAt: req.body.observedAt,
        req,
      });

      res.status(201).json({
        success: true,
        data: result,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/caregiver/patients/:patientId/concerns
 * List concerns submitted by caregivers.
 */
router.get(
  '/caregiver/patients/:patientId/concerns',
  requireCaregiverScope('CONCERN_SUBMIT'),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const orgId = req.tenant.organizationObjectId;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const result = await listCaregiverConcerns({
        organizationId: orgId,
        patientId,
        page,
        limit,
      });

      res.json({
        success: true,
        data: result.concerns,
        pagination: result.pagination,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

// =========================================================================
// 4. ASSISTED VOICE CHECK-IN
// =========================================================================

/**
 * POST /api/v1/caregiver/patients/:patientId/voice-assistance
 * Start an assisted dialogue session. Requires VOICE_CHECKIN_ASSIST.
 */
router.post(
  '/caregiver/patients/:patientId/voice-assistance',
  requireCaregiverScope('VOICE_CHECKIN_ASSIST'),
  validateRequest(assistedVoiceSessionSchema),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const orgId = req.tenant.organizationObjectId;
      const caregiverUserId = req.user.id || req.user._id;

      const result = await startAssistedDialogueSession({
        organizationId: orgId,
        patientId,
        caregiverUserId,
        templateId: req.body?.templateId || 'DAILY_WELLNESS_CHECKIN',
        req,
      });

      res.status(201).json({
        success: true,
        data: result,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/caregiver/patients/:patientId/voice-assistance/:sessionId/end
 * End an assisted dialogue session. Requires VOICE_CHECKIN_ASSIST.
 */
router.post(
  '/caregiver/patients/:patientId/voice-assistance/:sessionId/end',
  requireCaregiverScope('VOICE_CHECKIN_ASSIST'),
  validateRequest(endAssistedVoiceSessionSchema),
  async (req, res, next) => {
    try {
      const { sessionId } = req.params;
      const orgId = req.tenant.organizationObjectId;
      const caregiverUserId = req.user.id || req.user._id;

      const session = await endAssistedDialogueSession({
        organizationId: orgId,
        sessionId,
        caregiverUserId,
        confirmationStatus: req.body.confirmationStatus,
        confirmedByPatient: req.body.confirmedByPatient,
        req,
      });

      res.json({
        success: true,
        data: session,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

// =========================================================================
// 5. CAREGIVER ACCESS AUDIT
// =========================================================================

/**
 * GET /api/v1/patients/:patientId/caregiver-access-events
 * Patient inspects who viewed their record.
 */
router.get('/patients/:patientId/caregiver-access-events', async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const orgId = req.tenant.organizationObjectId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const patient = await Patient.findOne({ _id: patientId, organizationId: orgId });
    if (!patient) {
      throw new NotFoundError('Patient not found.');
    }

    if (
      req.tenant.role === 'PATIENT' &&
      patient.userId &&
      patient.userId.toString() !== (req.user.id || req.user._id).toString()
    ) {
      throw new AuthorizationError('Patients may only inspect access events for their own health records.');
    }

    const result = await getPatientCaregiverAccessHistory(orgId, patientId, { page, limit });

    res.json({
      success: true,
      data: result.events,
      pagination: result.pagination,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/caregiver/access-events
 * Caregiver inspects their own historical access audit log.
 */
router.get('/caregiver/access-events', async (req, res, next) => {
  try {
    const caregiverUserId = req.user.id || req.user._id;
    const orgId = req.tenant.organizationObjectId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await getCaregiverOwnAccessHistory(orgId, caregiverUserId, { page, limit });

    res.json({
      success: true,
      data: result.events,
      pagination: result.pagination,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
