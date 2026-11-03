import { z } from 'zod';
import { objectIdSchema } from './common.schemas.js';

export const reportPatientParamSchema = z.object({
  patientId: objectIdSchema,
});

export const reportIdParamSchema = z.object({
  reportId: objectIdSchema,
});

export const generateReportBodySchema = z.object({
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
});

