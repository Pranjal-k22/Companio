import { z } from 'zod';

export const createDialogueSessionSchema = z.object({
  templateId: z.enum(['DAILY_WELLNESS_CHECKIN', 'WEEKLY_HEALTH_REVIEW']).optional().default('DAILY_WELLNESS_CHECKIN'),
  conversationId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId for conversationId').optional(),
});

export const dialogueSessionIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId for dialogueSessionId'),
});

export const resolveClarificationSchema = z.object({
  questionId: z.string().min(1, 'questionId is required'),
  resolvedValue: z.any(),
  topic: z.string().optional(),
});

export const confirmSessionSchema = z.object({
  confirmationStatus: z.enum(['CONFIRMED', 'DISPUTED', 'BYPASSED']),
  readbackTranscript: z.string().optional(),
});

