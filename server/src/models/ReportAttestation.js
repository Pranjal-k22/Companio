import mongoose from 'mongoose';

export const ATTESTATION_STATEMENT_DEFAULT =
  'I have reviewed this report and its available supporting patient information. My approval represents my clinical review of this document.';

const amendmentHistorySchema = new mongoose.Schema(
  {
    previousVersion: { type: Number, required: true },
    amendedAt: { type: Date, default: Date.now },
    amendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, trim: true },
    previousContentHash: { type: String },
  },
  { _id: false }
);

const authenticationContextSchema = new mongoose.Schema(
  {
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    authMethod: { type: String, default: 'BEARER_JWT' },
    requestId: { type: String, trim: true },
  },
  { _id: false }
);

const reportAttestationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required for attestation'],
      index: true,
    },
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      required: [true, 'Report ID is required for attestation'],
      index: true,
    },
    reportVersion: {
      type: Number,
      required: [true, 'Report version is required for attestation'],
      min: 1,
    },
    clinicianUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Clinician user ID is required for attestation'],
      index: true,
    },
    membershipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Membership',
      index: true,
    },
    attestationStatement: {
      type: String,
      required: [true, 'Attestation statement is required'],
      trim: true,
      default: ATTESTATION_STATEMENT_DEFAULT,
    },
    statementVersion: {
      type: String,
      default: '1.0',
      trim: true,
    },
    reportContentHash: {
      type: String,
      required: [true, 'Cryptographic report content hash is required'],
      trim: true,
    },
    approvedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUPERSEDED', 'REVOKED'],
      default: 'ACTIVE',
      index: true,
    },
    authenticationContext: {
      type: authenticationContextSchema,
      default: () => ({}),
    },
    amendmentHistory: [amendmentHistorySchema],
  },
  {
    timestamps: true,
  }
);

reportAttestationSchema.index({ reportId: 1, reportVersion: 1 }, { unique: true });
reportAttestationSchema.index({ organizationId: 1, clinicianUserId: 1, approvedAt: -1 });

export const ReportAttestation = mongoose.model('ReportAttestation', reportAttestationSchema);
export default ReportAttestation;
