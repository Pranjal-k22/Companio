import { z } from 'zod';

// Valid 24-character hex MongoDB ObjectId regex
export const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const objectIdSchema = z
  .string()
  .trim()
  .regex(OBJECT_ID_REGEX, 'Must be a valid 24-character hexadecimal MongoDB ObjectId.');

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().trim().optional(),
  order: z.enum(['asc', 'desc', '1', '-1']).default('desc'),
  search: z.string().trim().optional(),
});

