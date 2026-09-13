import mongoose from 'mongoose';

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
    sourceText: {
      type: String,
      trim: true,
    },
    structuredEvidence: {
      type: mongoose.Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ['open', 'reviewed', 'escalated', 'resolved', 'OPEN', 'REVIEWED', 'ESCALATED', 'RESOLVED'],
      default: 'open',
      lowercase: true,
      index: true,
    },
    escalatedAt: {
      type: Date,
    },
    notifiedVia: {
      type: String,
      trim: true,
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Requirement: Add compound index on (patientId, status)
flagSchema.index({ patientId: 1, status: 1 });
flagSchema.index({ patientId: 1, severity: 1 });

export const Flag = mongoose.model('Flag', flagSchema);
export default Flag;
