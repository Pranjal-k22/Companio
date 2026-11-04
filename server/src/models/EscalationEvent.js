import mongoose from 'mongoose';

export const ESCALATION_STATUSES = [
  'QUEUED',
  'PROCESSING',
  'ACCEPTED',
  'SENT',
  'DELIVERED',
  'FAILED',
  'RETRY_PENDING',
  'ACKNOWLEDGED',
  'RESOLVED',
  'PENDING', // Legacy support
];

const escalationEventSchema = new mongoose.Schema(
  {
    flagId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flag',
      required: [true, 'Flag ID is required for escalation event'],
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required for escalation event'],
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    clinicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    channel: {
      type: String,
      enum: ['EMAIL', 'SMS', 'WEBHOOK'],
      default: 'EMAIL',
      index: true,
    },
    recipient: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ESCALATION_STATUSES,
      default: 'QUEUED',
      index: true,
    },
    tier: {
      type: Number,
      default: 1, // Tier 1: Primary Clinician, Tier 2: On-Call / Supervisor
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    nextRetryAt: {
      type: Date,
      index: true,
    },
    providerMessageId: {
      type: String,
      trim: true,
      index: true,
    },
    providerResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
    error: {
      type: String,
      trim: true,
    },
    sentAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    acknowledgedAt: {
      type: Date,
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

escalationEventSchema.index({ flagId: 1, status: 1 });
escalationEventSchema.index({ organizationId: 1, status: 1, nextRetryAt: 1 });
escalationEventSchema.index({ status: 1, nextRetryAt: 1 });

export const EscalationEvent = mongoose.model('EscalationEvent', escalationEventSchema);
export default EscalationEvent;
