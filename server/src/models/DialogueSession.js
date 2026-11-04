import mongoose from 'mongoose';

const pendingClarificationSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    topic: { type: String, required: true },
    reason: { type: String, required: true },
    originalValue: { type: mongoose.Schema.Types.Mixed },
    attemptedTurn: { type: Number, default: 0 },
    resolved: { type: Boolean, default: false },
    resolvedValue: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const pendingConfirmationSchema = new mongoose.Schema(
  {
    observationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Observation' },
    summary: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'DISPUTED'],
      default: 'PENDING',
    },
  },
  { _id: false }
);

const dialogueSessionSchema = new mongoose.Schema(
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
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required'],
      index: true,
    },
    checkinId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Checkin',
      index: true,
    },
    templateId: {
      type: String,
      enum: ['DAILY_WELLNESS_CHECKIN', 'WEEKLY_HEALTH_REVIEW'],
      default: 'DAILY_WELLNESS_CHECKIN',
      required: true,
    },
    templateVersion: {
      type: String,
      default: '1.0.0',
    },
    sessionStatus: {
      type: String,
      enum: [
        'IN_PROGRESS',
        'PAUSED',
        'PENDING_CONFIRMATION',
        'CONFIRMED',
        'COMPLETED',
        'ABORTED',
        'PREEMPTED_SAFETY',
      ],
      default: 'IN_PROGRESS',
      index: true,
    },
    currentSection: {
      type: String,
      default: 'GREETING',
    },
    currentQuestionId: {
      type: String,
      default: 'GREETING_01',
    },
    completedSections: [{ type: String, trim: true }],
    skippedSections: [{ type: String, trim: true }],
    declinedSections: [{ type: String, trim: true }],
    pendingClarifications: [pendingClarificationSchema],
    pendingConfirmations: [pendingConfirmationSchema],
    observationIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Observation',
      },
    ],
    confirmationStatus: {
      type: String,
      enum: ['UNCONFIRMED', 'CONFIRMED', 'DISPUTED', 'BYPASSED'],
      default: 'UNCONFIRMED',
      index: true,
    },
    readbackTranscript: {
      type: String,
      trim: true,
    },
    turnCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    completedAt: {
      type: Date,
    },
    assistedByCaregiver: {
      isAssisted: { type: Boolean, default: false },
      caregiverUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      caregiverRelationshipId: { type: mongoose.Schema.Types.ObjectId, ref: 'CaregiverRelationship' },
      assistedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for tenant-scoped lookups and active session recovery
dialogueSessionSchema.index({ organizationId: 1, patientId: 1, startedAt: -1 });
dialogueSessionSchema.index({ conversationId: 1, organizationId: 1 });
dialogueSessionSchema.index({ organizationId: 1, sessionStatus: 1 });

/**
 * Idempotent Session Finalization
 */
dialogueSessionSchema.methods.finalizeSession = async function (confirmationStatus = 'CONFIRMED', checkinId = null) {
  if (['COMPLETED', 'CONFIRMED'].includes(this.sessionStatus) && this.completedAt) {
    // Already finalized idempotently
    return this;
  }

  this.sessionStatus = confirmationStatus === 'CONFIRMED' ? 'COMPLETED' : 'COMPLETED';
  this.confirmationStatus = confirmationStatus;
  this.completedAt = new Date();
  if (checkinId) this.checkinId = checkinId;

  return await this.save();
};

export const DialogueSession = mongoose.model('DialogueSession', dialogueSessionSchema);
export default DialogueSession;

