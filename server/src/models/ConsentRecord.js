import mongoose from 'mongoose';

export const CONSENT_PURPOSES = [
  'MICROPHONE',
  'LIVE_TRANSCRIPTION',
  'AI_PROCESSING',
  'AUDIO_RETENTION',
  'CLINICIAN_SHARING',
];

export const CONSENT_DECISIONS = ['GRANTED', 'WITHDRAWN'];

export const CONSENT_CHANNELS = [
  'WEB_PORTAL',
  'VOICE_PROMPT',
  'CLINIC_PAPER',
  'MOBILE_APP',
  'TELEHEALTH',
];

export const CONSENT_ACTOR_ROLES = [
  'PATIENT',
  'CAREGIVER',
  'CLINICIAN',
  'ORG_ADMIN',
  'ORG_OWNER',
];

const consentRecordSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required for consent record'],
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required for consent record'],
      index: true,
    },
    purpose: {
      type: String,
      enum: {
        values: CONSENT_PURPOSES,
        message: 'Invalid consent purpose: {VALUE}',
      },
      required: [true, 'Consent purpose is required'],
    },
    decision: {
      type: String,
      enum: {
        values: CONSENT_DECISIONS,
        message: 'Invalid consent decision: {VALUE}',
      },
      required: [true, 'Consent decision is required'],
    },
    noticeVersion: {
      type: String,
      required: [true, 'Notice version is required'],
      default: '2026.1',
      trim: true,
    },
    channel: {
      type: String,
      enum: {
        values: CONSENT_CHANNELS,
        message: 'Invalid consent channel: {VALUE}',
      },
      default: 'WEB_PORTAL',
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Actor ID is required for audit trail'],
    },
    actorRole: {
      type: String,
      enum: {
        values: CONSENT_ACTOR_ROLES,
        message: 'Invalid actor role: {VALUE}',
      },
      required: [true, 'Actor role is required for audit trail'],
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Consent records are immutable; no updatedAt
  }
);

// Compound indexes for fast effective-consent resolution and chronological audit log
consentRecordSchema.index({ organizationId: 1, patientId: 1, purpose: 1, createdAt: -1 });
consentRecordSchema.index({ organizationId: 1, patientId: 1, createdAt: -1 });

/**
 * Immutability Guard: Prevent document modification once written to database.
 * Every consent state change MUST be an append-only operation.
 */
consentRecordSchema.pre('updateOne', function (next) {
  next(new Error('ConsentRecord is immutable. Append a new versioned ConsentRecord to change consent status.'));
});

consentRecordSchema.pre('updateMany', function (next) {
  next(new Error('ConsentRecord is immutable. Append a new versioned ConsentRecord to change consent status.'));
});

consentRecordSchema.pre('findOneAndUpdate', function (next) {
  next(new Error('ConsentRecord is immutable. Append a new versioned ConsentRecord to change consent status.'));
});

consentRecordSchema.pre('replaceOne', function (next) {
  next(new Error('ConsentRecord is immutable. Append a new versioned ConsentRecord to change consent status.'));
});

/**
 * Deletion Guard: Prevent direct document removal unless explicitly flagged for compliance purge.
 */
consentRecordSchema.pre('deleteOne', function (next) {
  if (this._conditions && this._conditions.__forceCompliancePurge) {
    return next();
  }
  next(new Error('Consent records cannot be deleted directly. Regulatory compliance requires maintaining the consent audit log.'));
});

consentRecordSchema.pre('deleteMany', function (next) {
  if (this._conditions && this._conditions.__forceCompliancePurge) {
    return next();
  }
  next(new Error('Consent records cannot be deleted directly. Regulatory compliance requires maintaining the consent audit log.'));
});

consentRecordSchema.pre('findOneAndDelete', function (next) {
  if (this._conditions && this._conditions.__forceCompliancePurge) {
    return next();
  }
  next(new Error('Consent records cannot be deleted directly. Regulatory compliance requires maintaining the consent audit log.'));
});

const ConsentRecord = mongoose.model('ConsentRecord', consentRecordSchema);

export default ConsentRecord;
