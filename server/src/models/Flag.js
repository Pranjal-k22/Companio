import mongoose from 'mongoose';

export const FLAG_STATUSES = [
  'detected',
  'open',
  'acknowledged',
  'in_review',
  'escalated',
  'resolved',
  'false_positive',
  'duplicate',
  'reopened',
  'reviewed', // Legacy status compatibility
];

const statusHistorySchema = new mongoose.Schema(
  {
    previousStatus: { type: String, lowercase: true },
    newStatus: { type: String, required: true, lowercase: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, trim: true },
    requestId: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const reviewNoteSchema = new mongoose.Schema(
  {
    note: { type: String, required: true, trim: true },
    clinicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clinicianName: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const evidenceSchema = new mongoose.Schema(
  {
    source: { type: String, required: true },
    text: { type: String, required: true },
    matchedPattern: { type: String },
    ruleId: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const flagSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required for a flag'],
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required for a flag'],
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    turnId: {
      type: String,
      trim: true,
      index: true,
    },
    severity: {
      type: String,
      enum: {
        values: ['red', 'yellow', 'RED', 'YELLOW'],
        message: '{VALUE} is not a valid flag severity',
      },
      required: [true, 'Flag severity is required'],
      lowercase: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Flag category is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Flag description is required'],
      trim: true,
    },
    ruleId: {
      type: String,
      trim: true,
    },
    ruleVersion: {
      type: String,
      default: '1.0',
      trim: true,
    },
    sourceText: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      default: 'llm_tool',
      trim: true,
    },
    sources: [
      {
        type: String,
        trim: true,
      },
    ],
    evidence: [evidenceSchema],
    structuredEvidence: {
      type: mongoose.Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: {
        values: [
          ...FLAG_STATUSES,
          ...FLAG_STATUSES.map((s) => s.toUpperCase()),
        ],
        message: '{VALUE} is not a valid flag status',
      },
      default: 'open',
      lowercase: true,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    acknowledgedAt: {
      type: Date,
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    escalatedAt: {
      type: Date,
    },
    escalationTier: {
      type: Number,
      default: 1,
    },
    slaBreached: {
      type: Boolean,
      default: false,
      index: true,
    },
    slaBreachedAt: {
      type: Date,
    },
    slaTargetMinutes: {
      type: Number,
    },
    notifiedVia: {
      type: String,
      trim: true,
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewNotes: [reviewNoteSchema],
    resolutionReason: {
      type: String,
      trim: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flag',
    },
    statusHistory: [statusHistorySchema],
  },
  {
    timestamps: true,
  }
);

// Compound indexes
flagSchema.index({ patientId: 1, status: 1 });
flagSchema.index({ patientId: 1, severity: 1 });
flagSchema.index({ conversationId: 1, category: 1 });
flagSchema.index({ organizationId: 1, patientId: 1, severity: 1, status: 1 });
flagSchema.index({ organizationId: 1, status: 1, createdAt: -1 });

// Method to transition status with audit history
flagSchema.methods.transitionStatus = function (newStatus, changedBy = null, reason = '', requestId = '') {
  const normNewStatus = newStatus.toLowerCase();
  const previousStatus = this.status;

  this.status = normNewStatus;

  const now = new Date();
  if (normNewStatus === 'acknowledged' && !this.acknowledgedAt) {
    this.acknowledgedAt = now;
    this.acknowledgedBy = changedBy;
  } else if (normNewStatus === 'reviewed' && !this.reviewedAt) {
    this.reviewedAt = now;
    this.reviewedBy = changedBy;
  } else if (normNewStatus === 'escalated' && !this.escalatedAt) {
    this.escalatedAt = now;
  } else if (normNewStatus === 'resolved' && !this.resolvedAt) {
    this.resolvedAt = now;
    this.resolvedBy = changedBy;
    this.resolutionReason = reason;
  }

  this.statusHistory.push({
    previousStatus,
    newStatus: normNewStatus,
    changedBy,
    reason,
    requestId,
    timestamp: now,
  });

  return this;
};

// Post-save hook to automatically trigger clinician escalation notification on RED flag creation
flagSchema.post('save', async function (doc) {
  if (
    (doc.severity === 'red' || doc.severity === 'RED') &&
    !doc.escalatedAt &&
    !['resolved', 'closed', 'false_positive'].includes(doc.status)
  ) {
    try {
      const { notifyClinicianForRedFlag } = await import('../services/escalation/notifyClinician.js');
      await notifyClinicianForRedFlag(doc);
    } catch (err) {
      console.error('[Flag Post-Save Escalation Warning]:', err.message);
    }
  }
});

export const Flag = mongoose.model('Flag', flagSchema);
export default Flag;
