import mongoose from 'mongoose';

/**
 * Team Schema
 * Represents clinical care teams (e.g. Geriatric Cardiology, Memory Care, Home Triage)
 * operating within a specific Organization.
 */
const teamSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required for a team'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      maxlength: [100, 'Team name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    department: {
      type: String,
      trim: true,
      default: 'General Medicine',
    },
    clinicianMembershipIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Membership',
      },
    ],
    status: {
      type: String,
      enum: {
        values: ['active', 'archived'],
        message: '{VALUE} is not a valid team status',
      },
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
teamSchema.index({ organizationId: 1, name: 1 }, { unique: true });
teamSchema.index({ organizationId: 1, status: 1 });

export const Team = mongoose.model('Team', teamSchema);
export default Team;
