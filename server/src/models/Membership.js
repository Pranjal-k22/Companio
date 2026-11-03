import mongoose from 'mongoose';
import { MEMBERSHIP_ROLES, DEFAULT_ROLE_PERMISSIONS } from '../constants/permissions.js';

/**
 * Membership Schema
 * Represents the scoped membership of a user within a specific Organization.
 * Multiple memberships per user allow cross-organizational access without identity duplication.
 */
const membershipSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required for membership'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for membership'],
      index: true,
    },
    role: {
      type: String,
      enum: {
        values: MEMBERSHIP_ROLES,
        message: '{VALUE} is not a valid organization membership role',
      },
      required: [true, 'Membership role is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'invited', 'suspended', 'inactive'],
        message: '{VALUE} is not a valid membership status',
      },
      default: 'active',
      index: true,
    },
    permissions: {
      type: [String],
      default: function () {
        return DEFAULT_ROLE_PERMISSIONS[this.role] || [];
      },
    },
    teamIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
      },
    ],
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring a user can have at most one membership per organization
membershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

// Performance queries
membershipSchema.index({ userId: 1, status: 1 });
membershipSchema.index({ organizationId: 1, role: 1, status: 1 });

// Ensure permissions are populated according to role if empty
membershipSchema.pre('save', function (next) {
  if (!this.permissions || this.permissions.length === 0) {
    this.permissions = DEFAULT_ROLE_PERMISSIONS[this.role] || [];
  }
  next();
});

export const Membership = mongoose.model('Membership', membershipSchema);
export default Membership;
