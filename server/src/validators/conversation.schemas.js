import { z } from 'zod';
import { objectIdSchema } from './common.schemas.js';

export const conversationIdParamSchema = z.object({
  id: objectIdSchema,
});

export const conversationQuerySchema = z.object({
  patientId: objectIdSchema.optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const startVoiceSessionSchema = z.object({
  patientId: objectIdSchema.optional(),
  type: z.enum(['daily', 'weekly', 'medication_review', 'symptom_followup', 'appointment_prep']).default('daily'),
});

