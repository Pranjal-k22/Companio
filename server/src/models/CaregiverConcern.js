import mongoose from 'mongoose';

export const CONCERN_CATEGORIES = [
  'fall_concern',
  'confusion_or_memory',
  'medication_difficulty',
  'appetite_or_weight',
  'mobility_deterioration',
  'mood_or_isolation',
  'pain_or_discomfort',
  'other',
];

export const CONCERN_STATUSES = [
  'SUBMITTED',
  'UNDER_CLINICIAN_REVIEW',
  'TRIAGED',
  'DISMISSED',
];

const caregiverConcernSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required'],
      index: true,
    },
    caregiverUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Caregiver user ID is required'],
      index: true,
    },
    caregiverRelationshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CaregiverRelationship',
      required: [true, 'Caregiver relationship ID is required'],
      index: true,
    },
    category: {
      type: String,
      enum: {
        values: CONCERN_CATEGORIES,
        message: 'Invalid concern category: {VALUE}',
      },
      default: 'other',
      required: true,
    },
    description: {
      type: String,
      required: [true, 'Concern description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    sourceType: {
      type: String,
      default: 'CAREGIVER_REPORTED',
      immutable: true,
      required: true,
    },
    observedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    relatedConversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
    },
    status: {
      type: String,
      enum: {
        values: CONCERN_STATUSES,
        message: 'Invalid concern status: {VALUE}',
      },
      default: 'SUBMITTED',
      index: true,
    },
    linkedFlagId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flag',
    },
    clinicalNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Clinical notes cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

caregiverConcernSchema.index({ organizationId: 1, patientId: 1, submittedAt: -1 });
caregiverConcernSchema.index({ caregiverUserId: 1, submittedAt: -1 });

export const CaregiverConcern = mongoose.model('CaregiverConcern', caregiverConcernSchema);
export default CaregiverConcern;

