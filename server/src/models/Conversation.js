import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required for a conversation'],
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'completed', 'interrupted', 'ACTIVE', 'COMPLETED', 'ABANDONED'],
        message: '{VALUE} is not a valid conversation status',
      },
      default: 'active',
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ['daily', 'weekly', 'medication_review', 'symptom_followup', 'appointment_prep', 'DAILY', 'WEEKLY', 'MEDICATION_REVIEW', 'SYMPTOM_FOLLOWUP', 'APPOINTMENT_PREP'],
        message: '{VALUE} is not a valid conversation type',
      },
      default: 'daily',
    },
    rawTranscriptRef: {
      type: String,
      trim: true,
    },
    summary: {
      type: String,
      trim: true,
    },
    transcriptSnippet: {
      type: String,
      trim: true,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    aiToneSummary: {
      type: String,
      trim: true,
    },
    sttAccuracy: {
      type: String,
      default: '98%',
    },
    riskFlag: {
      type: String,
      enum: ['Red Flag', 'Yellow Flag', 'Stable', 'red', 'yellow', 'none'],
      default: 'Stable',
    },
    dialogueSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DialogueSession',
      index: true,
    },
    confirmationStatus: {
      type: String,
      enum: ['UNCONFIRMED', 'CONFIRMED', 'DISPUTED', 'BYPASSED'],
      default: 'UNCONFIRMED',
      index: true,
    },
    agendaState: {
      type: mongoose.Schema.Types.Mixed,
    },
    turns: [
      {
        turnId: {
          type: String,
          trim: true,
        },
        role: {
          type: String,
          enum: ['user', 'assistant', 'system'],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Indexes
conversationSchema.index({ patientId: 1, startedAt: -1 });
conversationSchema.index({ organizationId: 1, patientId: 1, startedAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
