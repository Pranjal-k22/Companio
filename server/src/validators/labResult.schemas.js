import { z } from 'zod';
import { objectIdSchema } from './common.schemas.js';

export const labPatientParamSchema = z.object({
  patientId: objectIdSchema,
});

export const labResultIdParamSchema = z.object({
  id: objectIdSchema,
});

export const markerSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().optional(),
  value: z.number(),
  unit: z.string().trim().min(1),
  referenceRange: z.string().trim().min(1),
  isAbnormal: z.boolean().default(false),
  flagSeverity: z.enum(['normal', 'abnormal', 'critical']).default('normal'),
});

export const createLabResultSchema = z.object({
  patientId: objectIdSchema,
  panelName: z.string().trim().min(2).max(150),
  panelCategory: z.enum(['hematology', 'metabolic', 'lipid', 'renal', 'hepatic', 'endocrine', 'cardiac_markers']).default('metabolic'),
  collectionDate: z.coerce.date(),
  resultDate: z.coerce.date().optional(),
  labFacility: z.string().trim().min(2),
  markers: z.array(markerSchema).min(1, 'At least one biomarker measurement is required.'),
  overallInterpretation: z.string().trim().optional(),
});

