import mongoose from 'mongoose';

export const CAREGIVER_PERMISSION_SCOPES = [
  'PROFILE_READ',
  'WELLNESS_SUMMARY_READ',
  'CHECKIN_HISTORY_READ',
  'MEDICATION_SCHEDULE_READ',
  'MEDICATION_ADHERENCE_READ',
  'APPOINTMENT_READ',
  'APPOINTMENT_COORDINATE',
  'OBSERVATIONS_READ',
  'PATIENT_CONCERNS_READ',
  'REPORT_SUMMARY_READ',
  'NOTIFICATION_RECEIVE',
  'VOICE_CHECKIN_ASSIST',
  'CONCERN_SUBMIT',
];

export const GRANT_STATUSES = [
  'ACTIVE',
  'SUSPENDED',
  'REVOKED',
  'EXPIRED',
];

const caregiverAccessGrantSchema = new mongoose.Schema(
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
    caregiverRelationshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CaregiverRelationship',
      required: [true, 'Caregiver relationship ID is required'],
      index: true,
    },
    permissionScopes: {
      type: [String],
      enum: {
        values: CAREGIVER_PERMISSION_SCOPES,
        message: 'Invalid permission scope: {VALUE}',
      },
      default: [
        'PROFILE_READ',
        'WELLNESS_SUMMARY_READ',
        'CHECKIN_HISTORY_READ',
        'APPOINTMENT_READ',
        'NOTIFICATION_RECEIVE',
      ],
      required: true,
    },
    consentRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ConsentRecord',
    },
    consentVersion: {
      type: String,
      default: '2026.1',
    },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorizationType: {
      type: String,
      enum: ['PATIENT_AUTHORIZED', 'VERIFIED_LEGAL_AUTHORITY'],
      default: 'PATIENT_AUTHORIZED',
      required: true,
    },
    status: {
      type: String,
      enum: {
        values: GRANT_STATUSES,
        message: 'Invalid grant status: {VALUE}',
      },
      default: 'ACTIVE',
      index: true,
      required: true,
    },
    grantedAt: {
      type: Date,
      default: Date.now,
    },
    effectiveFrom: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
    },
    revokedAt: {
      type: Date,
    },
    revocationReason: {
      type: String,
      trim: true,
    },
    previousGrantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CaregiverAccessGrant',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
caregiverAccessGrantSchema.index({ organizationId: 1, patientId: 1, status: 1 });
caregiverAccessGrantSchema.index({ caregiverRelationshipId: 1, status: 1 });

/**
 * Method to check if a specific scope is effectively granted and active
 */
caregiverAccessGrantSchema.methods.hasScope = function (scope) {
  if (this.status !== 'ACTIVE') return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  if (this.effectiveFrom && new Date() < this.effectiveFrom) return false;
  return Array.isArray(this.permissionScopes) && this.permissionScopes.includes(scope);
};

export const CaregiverAccessGrant = mongoose.model('CaregiverAccessGrant', caregiverAccessGrantSchema);
export default CaregiverAccessGrant;
