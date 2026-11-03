import { z } from 'zod';
import { objectIdSchema } from './common.schemas.js';

export const flagIdParamSchema = z.object({
  flagId: objectIdSchema,
});

export const flagPatientParamSchema = z.object({
  patientId: objectIdSchema,
});

export const updateFlagStatusSchema = z.object({
  status: z.enum(['open', 'reviewed', 'escalated', 'resolved'], {
    errorMap: () => ({ message: 'Status must be one of: open, reviewed, escalated, resolved' }),
  }),
});
