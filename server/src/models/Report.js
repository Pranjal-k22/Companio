import mongoose from 'mongoose';

export const REPORT_STATUSES = [
  'GENERATED',
  'VALIDATING',
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'PUBLISHED',
  'REJECTED',
  'SUPERSEDED',
  'AMENDED',
  'STALE',
];

export const REPORT_TYPES = ['DAILY_REPORT', 'WEEKLY_REPORT', 'CUSTOM_PERIOD_REPORT'];

export const NARRATION_MODES = ['AI_GENERATED', 'TEMPLATE_FALLBACK', 'CLINICIAN_EDITED'];

const flagReferenceSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    category: { type: String, required: true },
    flagId: { type: mongoose.Schema.Types.ObjectId, ref: 'Flag' },
    severity: { type: String, enum: ['red', 'yellow', 'RED', 'YELLOW'] },
    status: { type: String },
    detectedAt: { type: Date },
  },
  { _id: false }
);

const evidenceReferenceSchema = new mongoose.Schema(
  {
    claimText: { type: String, required: true },
    section: { type: String, required: true },
    sourceType: {
      type: String,
      enum: ['OBSERVATION', 'FLAG', 'METRIC', 'PATIENT_PROFILE', 'CHECKIN'],
      required: true,
    },
    sourceId: { type: String, required: true },
    confidence: { type: Number, min: 0, max: 1, default: 1 },
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required for a report'],
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    reportType: {
      type: String,
      enum: REPORT_TYPES,
      default: 'WEEKLY_REPORT',
      index: true,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
      required: true,
    },
    rootReportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      index: true,
    },
    supersedesReportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      index: true,
    },
    supersededByReportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
    },
    status: {
      type: String,
      enum: REPORT_STATUSES,
      default: 'DRAFT',
      index: true,
    },
    periodStart: {
      type: Date,
      required: [true, 'Report periodStart is required'],
    },
    periodEnd: {
      type: Date,
      required: [true, 'Report periodEnd is required'],
    },
    overview: {
      type: String,
      trim: true,
    },
    redFlags: [flagReferenceSchema],
    yellowFlags: [flagReferenceSchema],
    positiveProgress: [{ type: String, trim: true }],
    trends: {
      weight: [{ type: mongoose.Schema.Types.Mixed }],
      adherencePct: { type: Number, min: 0, max: 100 },
      sleepAvg: { type: Number, min: 0 },
      activityAvg: { type: Number, min: 0 },
      hydrationAvg: { type: Number, min: 0 },
    },
    deterministicMetrics: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    dataCompleteness: {
      expectedDataPoints: { type: Number, default: 0 },
      availableDataPoints: { type: Number, default: 0 },
      missingObservations: { type: Number, default: 0 },
      declinedObservations: { type: Number, default: 0 },
      invalidObservations: { type: Number, default: 0 },
      completenessRatio: { type: Number, default: 1 },
      limitations: [{ type: String, trim: true }],
    },
    patientConcerns: [{ type: String, trim: true }],
    followUp: [{ type: String, trim: true }],
    aiSuggestions: [{ type: String, trim: true }],
    clinicianTasks: [{ type: String, trim: true }],
    contentHash: {
      type: String,
      trim: true,
      index: true,
    },
    narrationMode: {
      type: String,
      enum: NARRATION_MODES,
      default: 'TEMPLATE_FALLBACK',
    },
    validationStatus: {
      type: String,
      enum: ['PENDING', 'VALIDATED', 'FAILED'],
      default: 'PENDING',
    },
    validationDetails: {
      errors: [{ type: String }],
      warnings: [{ type: String }],
      validatedAt: { type: Date },
    },
    sourceSnapshot: {
      observationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Observation' }],
      checkinIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Checkin' }],
      flagIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Flag' }],
      conversationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' }],
      snapshotTimestamp: { type: Date, default: Date.now },
      sourceVersionHash: { type: String },
    },
    attestation: {
      attestationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReportAttestation' },
      clinicianUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      clinicianName: { type: String, trim: true },
      attestedAt: { type: Date },
      statement: { type: String, trim: true },
    },
    isStale: {
      type: Boolean,
      default: false,
    },
    staleReason: {
      type: String,
      trim: true,
    },
    amendmentReason: {
      type: String,
      trim: true,
    },
    amendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    evidenceReferences: [evidenceReferenceSchema],
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for high performance multi-tenant queries
reportSchema.index({ patientId: 1, generatedAt: -1 });
reportSchema.index({ organizationId: 1, patientId: 1, generatedAt: -1 });
reportSchema.index({ organizationId: 1, status: 1, generatedAt: -1 });
reportSchema.index({ rootReportId: 1, version: -1 });
reportSchema.index({ patientId: 1, periodStart: 1, periodEnd: 1, version: -1 });

export const Report = mongoose.model('Report', reportSchema);
export default Report;
