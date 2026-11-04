import { z } from 'zod';
import { RELATIONSHIP_TYPES, AUTHORIZATION_TYPES } from '../models/CaregiverRelationship.js';
import { CAREGIVER_PERMISSION_SCOPES, GRANT_STATUSES } from '../models/CaregiverAccessGrant.js';
import { CONCERN_CATEGORIES } from '../models/CaregiverConcern.js';

export const createCaregiverInvitationSchema = z.object({
  body: z.object({
    invitationEmail: z.string().email('Please provide a valid email address').optional(),
    invitationPhone: z.string().min(7).max(20).optional(),
    relationshipType: z.enum(RELATIONSHIP_TYPES).default('FAMILY_MEMBER'),
    relationshipLabel: z.string().max(100).optional(),
    authorizationType: z.enum(AUTHORIZATION_TYPES).default('PATIENT_AUTHORIZED'),
    legalAuthorityVerification: z
      .object({
        verificationReference: z.string().optional(),
        authorityBasis: z.enum(['DURABLE_POWER_OF_ATTORNEY', 'LEGAL_GUARDIANSHIP', 'HEALTHCARE_PROXY', 'COURT_ORDER', 'OTHER']).default('DURABLE_POWER_OF_ATTORNEY'),
        notes: z.string().optional(),
      })
      .optional()
      .nullable(),
    initialScopes: z.array(z.enum(CAREGIVER_PERMISSION_SCOPES)).optional(),
    expiresInDays: z.number().int().min(1).max(30).default(7),
  }).refine((data) => data.invitationEmail || data.invitationPhone, {
    message: 'Either invitationEmail or invitationPhone must be provided',
    path: ['invitationEmail'],
  }),
});

export const acceptCaregiverInvitationSchema = z.object({
  body: z.object({
    token: z.string().min(16, 'Invalid invitation token format'),
  }),
});

export const updateCaregiverGrantSchema = z.object({
  params: z.object({
    grantId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid grant ObjectId format'),
  }),
  body: z.object({
    permissionScopes: z.array(z.enum(CAREGIVER_PERMISSION_SCOPES)).optional(),
    status: z.enum(GRANT_STATUSES).optional(),
    expiresAt: z.string().datetime().nullable().optional(),
  }),
});

export const revokeCaregiverAccessSchema = z.object({
  body: z.object({
    revocationReason: z.string().min(3).max(500).default('Revoked by patient'),
  }),
});

export const submitCaregiverConcernSchema = z.object({
  params: z.object({
    patientId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid patient ObjectId format'),
  }),
  body: z.object({
    category: z.enum(CONCERN_CATEGORIES).default('other'),
    description: z.string().min(5, 'Description must be at least 5 characters').max(2000),
    observedAt: z.string().datetime().optional(),
  }),
});

export const assistedVoiceSessionSchema = z.object({
  params: z.object({
    patientId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid patient ObjectId format'),
  }),
  body: z.object({
    templateId: z.enum(['DAILY_WELLNESS_CHECKIN', 'WEEKLY_HEALTH_REVIEW']).default('DAILY_WELLNESS_CHECKIN'),
  }).optional(),
});

export const endAssistedVoiceSessionSchema = z.object({
  params: z.object({
    patientId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid patient ObjectId format'),
    sessionId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid session ObjectId format'),
  }),
  body: z.object({
    confirmationStatus: z.enum(['CONFIRMED', 'DISPUTED', 'UNCONFIRMED']).default('CONFIRMED'),
    confirmedByPatient: z.boolean().default(true),
  }),
});

export default {
  createCaregiverInvitationSchema,
  acceptCaregiverInvitationSchema,
  updateCaregiverGrantSchema,
  revokeCaregiverAccessSchema,
  submitCaregiverConcernSchema,
  assistedVoiceSessionSchema,
  endAssistedVoiceSessionSchema,
};
