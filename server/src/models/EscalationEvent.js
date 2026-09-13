import mongoose from 'mongoose';

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
    clinicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    channel: {
      type: String,
      enum: ['EMAIL', 'SMS'],
      default: 'EMAIL',
    },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    providerMessageId: {
      type: String,
      trim: true,
    },
    error: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    sentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

escalationEventSchema.index({ flagId: 1, status: 1 });

export const EscalationEvent = mongoose.model('EscalationEvent', escalationEventSchema);
export default EscalationEvent;
