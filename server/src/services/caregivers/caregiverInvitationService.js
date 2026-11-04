import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  CaregiverRelationship,
  CaregiverAccessGrant,
  User,
  Patient,
  Membership,
} from '../../models/index.js';
import { ValidationError, NotFoundError, AuthorizationError } from '../../errors/AppError.js';
import { logCaregiverAccessEvent } from './caregiverPermissionService.js';
import logger from '../../utils/logger.js';

const INVITATION_EXPIRATION_DAYS = 7;

/**
 * Hash invitation token using SHA-256
 */
export function hashInvitationToken(token) {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Create a new caregiver invitation initiated by patient or authorized representative.
 */
export async function createCaregiverInvitation({
  organizationId,
  patientId,
  invitedByUserId,
  invitationEmail,
  invitationPhone,
  relationshipType = 'FAMILY_MEMBER',
  relationshipLabel,
  authorizationType = 'PATIENT_AUTHORIZED',
  legalAuthorityVerification = null,
  initialScopes = [
    'PROFILE_READ',
    'WELLNESS_SUMMARY_READ',
    'CHECKIN_HISTORY_READ',
    'APPOINTMENT_READ',
    'NOTIFICATION_RECEIVE',
  ],
  expiresInDays = INVITATION_EXPIRATION_DAYS,
  req = null,
}) {
  if (!organizationId || !patientId || !invitedByUserId) {
    throw new ValidationError('Organization ID, patient ID, and inviting user ID are required.');
  }

  if (!invitationEmail && !invitationPhone) {
    throw new ValidationError('Either an invitation email or phone number is required.');
  }

  const orgObjectId = new mongoose.Types.ObjectId(organizationId);
  const patientObjectId = new mongoose.Types.ObjectId(patientId);
  const invitingUserObjectId = new mongoose.Types.ObjectId(invitedByUserId);

  // 1. Verify patient exists in tenant
  const patient = await Patient.findOne({
    _id: patientObjectId,
    organizationId: orgObjectId,
  });

  if (!patient) {
    throw new NotFoundError('Patient record not found in this organization.');
  }

  // 2. Prevent duplicate active relationships for the same email
  if (invitationEmail) {
    const existingActive = await CaregiverRelationship.findOne({
      organizationId: orgObjectId,
      patientId: patientObjectId,
      invitationEmail: invitationEmail.toLowerCase().trim(),
      status: { $in: ['INVITED', 'ACTIVE'] },
    });

    if (existingActive) {
      throw new ValidationError(
        `An active invitation or relationship already exists for ${invitationEmail}.`
      );
    }
  }

  // 3. Generate cryptographically secure 32-byte hex token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashInvitationToken(rawToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  // 4. Create CaregiverRelationship document
  const relationship = await CaregiverRelationship.create({
    organizationId: orgObjectId,
    patientId: patientObjectId,
    relationshipType,
    relationshipLabel: relationshipLabel || relationshipType.replace('_', ' ').toLowerCase(),
    authorizationType,
    legalAuthorityVerification,
    status: 'INVITED',
    invitationTokenHash: tokenHash,
    invitationEmail: invitationEmail ? invitationEmail.toLowerCase().trim() : undefined,
    invitationPhone: invitationPhone ? invitationPhone.trim() : undefined,
    invitedBy: invitingUserObjectId,
    invitedAt: new Date(),
    expiresAt,
  });

  // 5. Pre-create pending CaregiverAccessGrant associated with the relationship
  const initialGrant = await CaregiverAccessGrant.create({
    organizationId: orgObjectId,
    patientId: patientObjectId,
    caregiverRelationshipId: relationship._id,
    permissionScopes: initialScopes,
    grantedBy: invitingUserObjectId,
    authorizationType,
    status: 'ACTIVE',
    effectiveFrom: new Date(),
  });

  // 6. Log access event
  await logCaregiverAccessEvent({
    organizationId,
    patientId,
    caregiverUserId: invitingUserObjectId,
    relationshipId: relationship._id,
    action: 'PERMISSION_GRANTED',
    permissionScope: initialScopes.join(','),
    resourceType: 'PATIENT',
    resourceId: patientId,
    outcome: 'ALLOWED',
    req,
  });

  logger.info('[Caregiver Invitation Created]', {
    relationshipId: relationship._id.toString(),
    patientId: patient._id.toString(),
    invitationEmail,
    expiresAt,
  });

  return {
    relationship,
    grant: initialGrant,
    rawToken, // Returned ONLY to the caller to generate the invitation link/email
    expiresAt,
  };
}

/**
 * Accept a caregiver invitation using the single-use token.
 * Authenticates that caregiverUser is logged in, links account, and activates relationship.
 */
export async function acceptCaregiverInvitation({
  rawToken,
  caregiverUserId,
  req = null,
}) {
  if (!rawToken || !caregiverUserId) {
    throw new ValidationError('Invitation token and caregiver user ID are required.');
  }

  const tokenHash = hashInvitationToken(rawToken);
  const caregiverUserObjectId = new mongoose.Types.ObjectId(caregiverUserId);

  // 1. Verify caregiver user exists and has CAREGIVER role
  const user = await User.findById(caregiverUserObjectId);
  if (!user) {
    throw new NotFoundError('Caregiver user account not found.');
  }

  // 2. Lookup relationship by token hash
  const relationship = await CaregiverRelationship.findOne({
    invitationTokenHash: tokenHash,
  });

  if (!relationship) {
    throw new NotFoundError('Invalid or expired caregiver invitation token.');
  }

  // 3. Verify status and expiry
  if (relationship.status !== 'INVITED') {
    throw new AuthorizationError(
      `Invitation cannot be accepted (current status: ${relationship.status}).`
    );
  }

  if (relationship.expiresAt && new Date() > relationship.expiresAt) {
    relationship.status = 'EXPIRED';
    await relationship.save();
    throw new AuthorizationError('This caregiver invitation has expired.');
  }

  // 4. Verify caregiver membership in organization exists or create one
  let membership = await Membership.findOne({
    organizationId: relationship.organizationId,
    userId: caregiverUserObjectId,
  });

  if (!membership) {
    membership = await Membership.create({
      organizationId: relationship.organizationId,
      userId: caregiverUserObjectId,
      role: 'CAREGIVER',
      status: 'active',
      joinedAt: new Date(),
    });
  } else if (membership.status !== 'active') {
    membership.status = 'active';
    await membership.save();
  }

  // 5. Atomic activation and token invalidation (single-use)
  relationship.caregiverUserId = caregiverUserObjectId;
  relationship.status = 'ACTIVE';
  relationship.acceptedAt = new Date();
  relationship.activatedAt = new Date();
  relationship.invitationTokenHash = null; // Invalidate single-use token
  await relationship.save();

  // 6. Ensure grant status is ACTIVE
  await CaregiverAccessGrant.updateMany(
    { caregiverRelationshipId: relationship._id },
    { status: 'ACTIVE', effectiveFrom: new Date() }
  );

  // 7. Log access event
  await logCaregiverAccessEvent({
    organizationId: relationship.organizationId,
    patientId: relationship.patientId,
    caregiverUserId: caregiverUserObjectId,
    relationshipId: relationship._id,
    action: 'ACCEPT_INVITATION',
    outcome: 'ALLOWED',
    req,
  });

  logger.info('[Caregiver Invitation Accepted]', {
    relationshipId: relationship._id.toString(),
    patientId: relationship.patientId.toString(),
    caregiverUserId: user._id.toString(),
  });

  return {
    relationship,
    patientId: relationship.patientId,
    organizationId: relationship.organizationId,
  };
}

/**
 * Revoke or cancel an invitation or active relationship.
 */
export async function revokeCaregiverRelationship({
  organizationId,
  relationshipId,
  revokedByUserId,
  revocationReason = 'Revoked by patient',
  req = null,
}) {
  const relObjectId = new mongoose.Types.ObjectId(relationshipId);
  const orgObjectId = new mongoose.Types.ObjectId(organizationId);

  const relationship = await CaregiverRelationship.findOne({
    _id: relObjectId,
    organizationId: orgObjectId,
  });

  if (!relationship) {
    throw new NotFoundError('Caregiver relationship not found.');
  }

  relationship.status = 'REVOKED';
  relationship.revokedAt = new Date();
  relationship.revocationReason = revocationReason;
  relationship.invitationTokenHash = null;
  await relationship.save();

  // Immediately revoke all associated access grants
  await CaregiverAccessGrant.updateMany(
    { caregiverRelationshipId: relationship._id, status: 'ACTIVE' },
    { status: 'REVOKED', revokedAt: new Date(), revocationReason }
  );

  // Log audit event
  await logCaregiverAccessEvent({
    organizationId,
    patientId: relationship.patientId,
    caregiverUserId: relationship.caregiverUserId || revokedByUserId,
    relationshipId: relationship._id,
    action: 'PERMISSION_REVOKED',
    outcome: 'ALLOWED',
    denialReason: revocationReason,
    req,
  });

  logger.info('[Caregiver Relationship Revoked]', {
    relationshipId: relationship._id.toString(),
    patientId: relationship.patientId.toString(),
    revocationReason,
  });

  return relationship;
}

export default {
  hashInvitationToken,
  createCaregiverInvitation,
  acceptCaregiverInvitation,
  revokeCaregiverRelationship,
};
