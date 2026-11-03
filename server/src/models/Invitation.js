import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * Invitation Schema
 * Manages secure invitations to join an Organization.
 * Stores cryptographically secure SHA-256 hashes of invitation tokens.
 */
const invitationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required for invitation'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Invitee email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid invitee email address'],
      index: true,
    },
    proposedRole: {
      type: String,
      enum: {
        values: ['ORG_ADMIN', 'CLINICIAN', 'CARE_COORDINATOR', 'PATIENT', 'CAREGIVER', 'AUDITOR'],
        message: '{VALUE} is not a valid invited role',
      },
      required: [true, 'Proposed role is required'],
    },
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    acceptedAt: {
      type: Date,
    },
    revokedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'revoked', 'expired'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
invitationSchema.index({ organizationId: 1, email: 1, status: 1 });

/**
 * Creates an invitation with a cryptographically secure token.
 * Returns the created document and the raw plain-text token (which must only be emailed, never logged or stored).
 */
invitationSchema.statics.generateInvitation = async function ({
  organizationId,
  email,
  proposedRole,
  invitedBy,
  expiryDays = 7,
}) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  const invitation = await this.create({
    organizationId,
    email: email.toLowerCase().trim(),
    proposedRole,
    tokenHash,
    invitedBy,
    expiresAt,
    status: 'pending',
  });

  return { invitation, rawToken };
};

/**
 * Finds and verifies a pending unexpired invitation by raw token string.
 */
invitationSchema.statics.verifyByRawToken = async function (rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const invitation = await this.findOne({
    tokenHash,
    status: 'pending',
  });

  if (!invitation) return null;

  // Check if expired
  if (invitation.expiresAt < new Date()) {
    invitation.status = 'expired';
    await invitation.save();
    return null;
  }

  return invitation;
};

export const Invitation = mongoose.model('Invitation', invitationSchema);
export default Invitation;

