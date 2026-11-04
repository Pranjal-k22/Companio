import mongoose from 'mongoose';

export const ACCESS_ACTIONS = [
  'VIEW_WELLNESS_SUMMARY',
  'VIEW_APPOINTMENT',
  'COORDINATE_APPOINTMENT',
  'VIEW_MEDICATION_SCHEDULE',
  'VIEW_CHECKIN_HISTORY',
  'VIEW_OBSERVATIONS',
  'VIEW_PATIENT_CONCERNS',
  'VIEW_REPORT_SUMMARY',
  'SUBMIT_CONCERN',
  'ASSIST_VOICE_SESSION',
  'ACCEPT_INVITATION',
  'PERMISSION_GRANTED',
  'PERMISSION_REVOKED',
  'ACCESS_DENIED',
];

export const ACCESS_RESOURCE_TYPES = [
  'PATIENT',
  'CHECKIN',
  'APPOINTMENT',
  'MEDICATION',
  'REPORT',
  'CONCERN',
  'DIALOGUE_SESSION',
];

const caregiverAccessEventSchema = new mongoose.Schema(
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
    relationshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CaregiverRelationship',
    },
    action: {
      type: String,
      enum: {
        values: ACCESS_ACTIONS,
        message: 'Invalid access action: {VALUE}',
      },
      required: true,
    },
    permissionScope: {
      type: String,
      trim: true,
    },
    resourceType: {
      type: String,
      enum: {
        values: ACCESS_RESOURCE_TYPES,
        message: 'Invalid resource type: {VALUE}',
      },
      default: 'PATIENT',
    },
    resourceId: {
      type: String,
      trim: true,
    },
    outcome: {
      type: String,
      enum: ['ALLOWED', 'DENIED'],
      default: 'ALLOWED',
      required: true,
    },
    denialReason: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    requestId: {
      type: String,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable append-only audit trail
  }
);

caregiverAccessEventSchema.index({ organizationId: 1, patientId: 1, timestamp: -1 });
caregiverAccessEventSchema.index({ organizationId: 1, caregiverUserId: 1, timestamp: -1 });

// Immutability Guard
caregiverAccessEventSchema.pre('updateOne', function (next) {
  next(new Error('CaregiverAccessEvent is immutable. Updates are strictly prohibited.'));
});

caregiverAccessEventSchema.pre('updateMany', function (next) {
  next(new Error('CaregiverAccessEvent is immutable. Updates are strictly prohibited.'));
});

caregiverAccessEventSchema.pre('findOneAndUpdate', function (next) {
  next(new Error('CaregiverAccessEvent is immutable. Updates are strictly prohibited.'));
});

export const CaregiverAccessEvent = mongoose.model('CaregiverAccessEvent', caregiverAccessEventSchema);
export default CaregiverAccessEvent;

