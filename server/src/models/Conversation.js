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
  },
  {
    timestamps: true,
  }
);

// Compound Index
conversationSchema.index({ patientId: 1, startedAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
