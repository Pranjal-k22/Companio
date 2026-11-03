import { z } from 'zod';
import { objectIdSchema } from './common.schemas.js';

export const patientIdParamSchema = z.object({
  id: objectIdSchema,
});

export const patientCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  age: z.coerce.number().int().min(0).max(130),
  contact: z
    .object({
      phone: z.string().trim().optional(),
      email: z.string().trim().email().optional(),
    })
    .optional(),
  emergencyContact: z
    .object({
      name: z.string().trim().optional(),
      relationship: z.string().trim().optional(),
      phone: z.string().trim().optional(),
    })
    .optional(),
  medications: z
    .array(
      z.object({
        name: z.string().trim(),
        dosage: z.string().trim(),
        frequency: z.string().trim(),
      })
    )
    .optional(),
  baselineMetrics: z
    .object({
      weight: z.number().min(0).optional(),
      sleepHoursTarget: z.number().min(0).max(24).optional(),
      activityGoal: z.number().min(0).optional(),
      hydrationGoalMl: z.number().min(0).optional(),
    })
    .optional(),
  assignedClinicianId: objectIdSchema.optional(),
});

export const updatePatientSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  age: z.coerce.number().int().min(0).max(130).optional(),
  contact: z
    .object({
      phone: z.string().trim().optional(),
      email: z.string().trim().email().optional(),
    })
    .optional(),
  emergencyContact: z
    .object({
      name: z.string().trim().optional(),
      relationship: z.string().trim().optional(),
      phone: z.string().trim().optional(),
    })
    .optional(),
  baselineMetrics: z
    .object({
      weight: z.number().min(0).optional(),
      sleepHoursTarget: z.number().min(0).max(24).optional(),
      activityGoal: z.number().min(0).optional(),
      hydrationGoalMl: z.number().min(0).optional(),
    })
    .optional(),
});

