import { z } from 'zod';
import { CONSENT_PURPOSES, CONSENT_DECISIONS, CONSENT_CHANNELS } from '../models/ConsentRecord.js';

export const recordConsentSchema = z.object({
  purpose: z.enum(CONSENT_PURPOSES, {
    required_error: 'Consent purpose is required.',
    invalid_type_error: 'Invalid consent purpose.',
  }),
  decision: z.enum(CONSENT_DECISIONS, {
    required_error: 'Consent decision is required.',
    invalid_type_error: 'Decision must be GRANTED or WITHDRAWN.',
  }),
  noticeVersion: z.string().trim().optional(),
  channel: z.enum(CONSENT_CHANNELS).optional(),
  notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters.').optional(),
});

export const recordBatchConsentSchema = z.object({
  decisions: z
    .array(
      z.object({
        purpose: z.enum(CONSENT_PURPOSES),
        decision: z.enum(CONSENT_DECISIONS),
        notes: z.string().trim().max(1000).optional(),
      })
    )
    .min(1, 'At least one consent decision is required.'),
  noticeVersion: z.string().trim().optional(),
  channel: z.enum(CONSENT_CHANNELS).optional(),
});

export const withdrawConsentSchema = z.object({
  purposes: z
    .array(z.enum(CONSENT_PURPOSES))
    .optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const anonymizePatientSchema = z.object({
  reason: z.string().trim().max(500).optional(),
  confirmation: z.literal(true, {
    errorMap: () => ({ message: 'Confirmation must be explicitly true to anonymize patient health records.' }),
  }),
});

export default {
  recordConsentSchema,
  recordBatchConsentSchema,
  withdrawConsentSchema,
  anonymizePatientSchema,
};

