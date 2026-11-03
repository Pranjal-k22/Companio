import { z } from 'zod';
import { objectIdSchema } from './common.schemas.js';

export const patientCheckinParamSchema = z.object({
  patientId: objectIdSchema,
});

export const checkinQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const createCheckinSchema = z.object({
  patientId: objectIdSchema,
  conversationId: objectIdSchema,
  type: z.enum(['daily', 'weekly', 'DAILY', 'WEEKLY']).default('daily'),
  adherence: z
    .object({
      taken: z.boolean().default(true),
      missedDoses: z.number().min(0).default(0),
      sideEffectsReported: z.array(z.string().trim()).default([]),
      notes: z.string().trim().optional(),
    })
    .optional(),
  symptoms: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        severity: z.enum(['mild', 'moderate', 'severe']).default('mild'),
        notes: z.string().trim().optional(),
      })
    )
    .default([]),
  sleep: z
    .object({
      hours: z.number().min(0).max(24).optional(),
      quality: z.enum(['poor', 'fair', 'good']).default('fair'),
    })
    .optional(),
  hydration: z
    .object({
      estimatedMl: z.number().min(0).optional(),
      glasses: z.number().min(0).optional(),
    })
    .optional(),
  activity: z
    .object({
      minutesActive: z.number().min(0).optional(),
      type: z.string().trim().optional(),
    })
    .optional(),
  nutrition: z
    .object({
      quality: z.string().trim().optional(),
      notes: z.string().trim().optional(),
    })
    .optional(),
  wellbeingScore: z.number().min(1).max(10).optional(),
  sentimentScore: z.number().min(-1).max(1).optional(),
});

