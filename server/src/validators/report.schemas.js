import { z } from 'zod';
import { objectIdSchema, paginationQuerySchema } from './common.schemas.js';

export const reportPatientParamSchema = z.object({
  patientId: objectIdSchema,
});

export const reportIdParamSchema = z.object({
  reportId: objectIdSchema,
});

export const generateReportBodySchema = z.object({
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  reportType: z.enum(['DAILY_REPORT', 'WEEKLY_REPORT', 'CUSTOM_PERIOD_REPORT']).optional(),
});

export const reportListQuerySchema = z.object({
  patientId: objectIdSchema.optional(),
  status: z.enum([
    'GENERATED',
    'VALIDATING',
    'DRAFT',
    'PENDING_REVIEW',
    'APPROVED',
    'PUBLISHED',
    'REJECTED',
    'SUPERSEDED',
    'AMENDED',
    'STALE',
    'ALL',
  ]).optional(),
  reportType: z.enum(['DAILY_REPORT', 'WEEKLY_REPORT', 'CUSTOM_PERIOD_REPORT']).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export const reportAttestBodySchema = z.object({
  statement: z.string().trim().min(5).optional(),
  statementVersion: z.string().trim().default('1.0').optional(),
});

export const reportRejectBodySchema = z.object({
  reason: z.string().trim().min(3, 'A clinical rejection reason is required'),
});

export const reportAmendBodySchema = z.object({
  amendmentReason: z.string().trim().min(3, 'An amendment reason is strictly required'),
  overview: z.string().trim().optional(),
  positiveProgress: z.array(z.string()).optional(),
  followUp: z.array(z.string()).optional(),
  clinicianTasks: z.array(z.string()).optional(),
  patientConcerns: z.array(z.string()).optional(),
});

export const reportExportBodySchema = z.object({
  format: z.enum(['pdf', 'PDF', 'json']).default('pdf').optional(),
});
