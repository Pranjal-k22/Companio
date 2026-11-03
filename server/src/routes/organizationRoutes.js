import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requirePermission } from '../middleware/tenantAuthorization.js';
import { validateRequest } from '../middleware/validate.js';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  inviteMemberSchema,
  acceptInvitationSchema,
  updateMemberSchema,
  createTeamSchema,
  updateTeamSchema,
  switchOrganizationSchema,
} from '../validators/organization.schemas.js';
import * as orgController from '../controllers/organizationController.js';
import * as teamController from '../controllers/teamController.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = express.Router();

// -------------------------------------------------------------
// PUBLIC / USER CONTEXT ROUTES (No Tenant Context Needed Yet)
// -------------------------------------------------------------

// List organizations caller belongs to
router.get('/', verifyToken, orgController.listUserOrganizations);

// Create new organization (caller becomes ORG_OWNER)
router.post(
  '/',
  verifyToken,
  validateRequest({ body: createOrganizationSchema }),
  orgController.createOrganization
);

// Switch active organization context
router.post(
  '/switch',
  verifyToken,
  validateRequest({ body: switchOrganizationSchema }),
  orgController.switchActiveOrganization
);

// Accept invitation
router.post(
  '/invitations/accept',
  verifyToken,
  validateRequest({ body: acceptInvitationSchema }),
  orgController.acceptInvitation
);

// -------------------------------------------------------------
// TENANT-SCOPED ROUTES (Require verifyToken + tenantContext)
// -------------------------------------------------------------

// Get current active organization profile
router.get('/:id', verifyToken, tenantContext, orgController.getOrganization);

// Update organization profile
router.patch(
  '/:id',
  verifyToken,
  tenantContext,
  requirePermission(PERMISSIONS.ORGANIZATION_UPDATE),
  validateRequest({ body: updateOrganizationSchema }),
  orgController.updateOrganization
);

// -------------------------------------------------------------
// MEMBERSHIP & INVITATION ROUTES
// -------------------------------------------------------------

// List members of active organization
router.get(
  '/:id/members',
  verifyToken,
  tenantContext,
  requirePermission(PERMISSIONS.MEMBERS_READ),
  orgController.listMembers
);

// Dispatch invitation to join organization
router.post(
  '/:id/invitations',
  verifyToken,
  tenantContext,
  requirePermission(PERMISSIONS.MEMBERS_INVITE),
  validateRequest({ body: inviteMemberSchema }),
  orgController.createInvitation
);

// Update member role or status
router.patch(
  '/:id/members/:memberId',
  verifyToken,
  tenantContext,
  requirePermission(PERMISSIONS.MEMBERS_MANAGE_ROLES),
  validateRequest({ body: updateMemberSchema }),
  orgController.updateMember
);

// Remove member
router.delete(
  '/:id/members/:memberId',
  verifyToken,
  tenantContext,
  requirePermission(PERMISSIONS.MEMBERS_REMOVE),
  orgController.removeMember
);

// -------------------------------------------------------------
// TEAM ROUTES
// -------------------------------------------------------------

// List teams
router.get(
  '/:id/teams',
  verifyToken,
  tenantContext,
  requirePermission(PERMISSIONS.TEAMS_READ),
  teamController.listTeams
);

// Create team
router.post(
  '/:id/teams',
  verifyToken,
  tenantContext,
  requirePermission(PERMISSIONS.TEAMS_MANAGE),
  validateRequest({ body: createTeamSchema }),
  teamController.createTeam
);

// Get team
router.get(
  '/:id/teams/:teamId',
  verifyToken,
  tenantContext,
  requirePermission(PERMISSIONS.TEAMS_READ),
  teamController.getTeam
);

// Update team
router.patch(
  '/:id/teams/:teamId',
  verifyToken,
  tenantContext,
  requirePermission(PERMISSIONS.TEAMS_MANAGE),
  validateRequest({ body: updateTeamSchema }),
  teamController.updateTeam
);

// Delete / Archive team
router.delete(
  '/:id/teams/:teamId',
  verifyToken,
  tenantContext,
  requirePermission(PERMISSIONS.TEAMS_MANAGE),
  teamController.deleteTeam
);

export default router;

