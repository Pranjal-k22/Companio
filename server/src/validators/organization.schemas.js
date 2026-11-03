import { z } from 'zod';
import { objectIdSchema } from './common.schemas.js';
import { MEMBERSHIP_ROLES } from '../constants/permissions.js';

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  legalName: z.string().max(150).optional(),
  organizationType: z.enum(['hospital', 'clinic', 'health_system', 'home_care', 'research', 'other']).optional(),
  registrationNumber: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  timezone: z.string().optional(),
  defaultLanguage: z.string().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  proposedRole: z.enum(['ORG_ADMIN', 'CLINICIAN', 'CARE_COORDINATOR', 'PATIENT', 'CAREGIVER', 'AUDITOR']),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(10),
});

export const updateMemberSchema = z.object({
  role: z.enum(MEMBERSHIP_ROLES).optional(),
  status: z.enum(['active', 'suspended', 'inactive']).optional(),
  teamIds: z.array(objectIdSchema).optional(),
});

export const createTeamSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  department: z.string().optional(),
  clinicianMembershipIds: z.array(objectIdSchema).optional(),
});

export const updateTeamSchema = createTeamSchema.partial();

export const switchOrganizationSchema = z.object({
  organizationId: z.string().min(1),
});

