import { z } from 'zod';
import { objectIdSchema } from './common.schemas.js';

export const flagIdParamSchema = z.object({
  flagId: objectIdSchema,
});

export const flagPatientParamSchema = z.object({
  patientId: objectIdSchema,
});

export const updateFlagStatusSchema = z.object({
  status: z.enum([
    'detected',
    'open',
    'acknowledged',
    'in_review',
    'escalated',
    'resolved',
    'false_positive',
    'duplicate',
    'reopened',
    'reviewed',
  ], {
    errorMap: () => ({ message: 'Invalid flag status value.' }),
  }),
  reason: z.string().optional(),
});

export const assignFlagSchema = z.object({
  assignedTo: objectIdSchema,
  reason: z.string().optional(),
});

export const addFlagNoteSchema = z.object({
  note: z.string().min(1, 'Note content cannot be empty').max(2000, 'Note is too long'),
});

export const resolveFlagSchema = z.object({
  resolutionReason: z.string().min(3, 'Clinical resolution reason is required (min 3 characters)'),
  isFalsePositive: z.boolean().optional(),
  duplicateOf: objectIdSchema.optional(),
});

export const reopenFlagSchema = z.object({
  reason: z.string().min(3, 'Reason for reopening flag is required'),
});

export default {
  flagIdParamSchema,
  flagPatientParamSchema,
  updateFlagStatusSchema,
  assignFlagSchema,
  addFlagNoteSchema,
  resolveFlagSchema,
  reopenFlagSchema,
};
