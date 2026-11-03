import { z } from 'zod';
import { objectIdSchema } from './common.schemas.js';

export const appointmentIdParamSchema = z.object({
  id: objectIdSchema,
});

export const appointmentQuerySchema = z.object({
  patientId: objectIdSchema.optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createAppointmentSchema = z.object({
  patientId: objectIdSchema,
  dateTime: z.coerce.date(),
  type: z.enum(['routine_checkup', 'cardiology_consult', 'telehealth_followup', 'prescription_review']).default('routine_checkup'),
  mode: z.enum(['in_person', 'telehealth', 'phone']).default('telehealth'),
  reason: z.string().trim().min(3).max(300),
  location: z.string().trim().optional(),
});

export const updateAppointmentSchema = z.object({
  dateTime: z.coerce.date().optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']).optional(),
  reason: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
