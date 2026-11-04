import { z } from 'zod';

export const observationIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId for observationId'),
});

export const patientObservationParamSchema = z.object({
  patientId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId for patientId'),
});

export const observationQuerySchema = z.object({
  category: z.string().optional(),
  code: z.string().optional(),
  confirmationStatus: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  page: z.coerce.number().min(1).optional().default(1),
});

export const createObservationSchema = z.object({
  patientId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId for patientId'),
  observationCode: z.string().min(1, 'observationCode is required'),
  observationCategory: z.enum([
    'medication',
    'symptom',
    'sleep',
    'hydration',
    'activity',
    'nutrition',
    'wellbeing',
    'safety',
    'social',
    'logistics',
    'vital',
  ]),
  observationDisplay: z.string().min(1, 'observationDisplay is required'),
  valueType: z.enum(['quantity', 'string', 'boolean', 'composite', 'missing']),
  valueQuantity: z
    .object({
      value: z.number(),
      unit: z.string().optional(),
      isApproximate: z.boolean().optional(),
    })
    .optional(),
  valueString: z.string().optional(),
  valueBoolean: z.boolean().optional(),
  valueComposite: z.any().optional(),
  missingReason: z
    .enum(['NOT_ASKED', 'DECLINED', 'UNKNOWN', 'UNABLE_TO_ASSESS', 'NOT_APPLICABLE', 'TECHNICAL_FAILURE'])
    .optional(),
  sourceQuote: z.string().optional(),
  sourceType: z
    .enum(['PATIENT_REPORTED', 'CLINICIAN_ENTERED', 'DEVICE_MEASURED', 'EXTERNAL_IMPORT', 'SYSTEM_DERIVED'])
    .optional()
    .default('CLINICIAN_ENTERED'),
});

export const amendObservationSchema = z.object({
  valueType: z.enum(['quantity', 'string', 'boolean', 'composite', 'missing']),
  valueQuantity: z
    .object({
      value: z.number(),
      unit: z.string().optional(),
      isApproximate: z.boolean().optional(),
    })
    .optional(),
  valueString: z.string().optional(),
  valueBoolean: z.boolean().optional(),
  valueComposite: z.any().optional(),
  correctionReason: z.string().min(1, 'correctionReason is required'),
});

export const verifyObservationSchema = z.object({
  verificationStatus: z.enum(['VERIFIED', 'REJECTED']),
  clinicalRationale: z.string().optional(),
});
