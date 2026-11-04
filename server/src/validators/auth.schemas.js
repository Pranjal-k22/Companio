import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Please provide a valid email address.').toLowerCase(),
  password: z.string().min(1, 'Password is required.'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(100),
  email: z.string().trim().email('Please provide a valid email address.').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  role: z.enum(['PATIENT', 'CLINICIAN', 'ADMIN']).default('PATIENT'),
  age: z.coerce.number().int().min(0).max(130).optional(),
  contact: z
    .object({
      phone: z.string().trim().optional(),
    })
    .optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(30).optional(),
  clinicName: z.string().trim().max(150).optional(),
  preferences: z
    .object({
      voiceSpeed: z.enum(['slow', 'normal', 'fast']).optional(),
      notificationsEnabled: z.boolean().optional(),
      redFlagSMS: z.boolean().optional(),
      dailyDigest: z.boolean().optional(),
    })
    .optional(),
  emergencyContact: z
    .object({
      name: z.string().trim().max(100).optional(),
      relationship: z.string().trim().max(50).optional(),
      phone: z.string().trim().max(30).optional(),
    })
    .optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Please provide a valid email address.').toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Reset token is required.'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long.'),
});

