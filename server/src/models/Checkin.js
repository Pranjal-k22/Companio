import mongoose from 'mongoose';

const symptomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe'],
      default: 'mild',
    },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const checkinSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required for check-in'],
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required for check-in'],
      index: true,
    },
    type: {
      type: String,
      enum: ['daily', 'weekly', 'DAILY', 'WEEKLY'],
      default: 'daily',
    },
    adherence: {
      taken: { type: Boolean, default: true },
      missedDoses: { type: Number, default: 0, min: 0 },
      sideEffectsReported: [{ type: String, trim: true }],
      notes: { type: String, trim: true },
    },
    symptoms: [symptomSchema],
    sleep: {
      hours: { type: Number, min: 0, max: 24 },
      quality: {
        type: String,
        enum: ['poor', 'fair', 'good'],
        default: 'fair',
      },
    },
    hydration: {
      estimatedMl: { type: Number, min: 0 },
      glasses: { type: Number, min: 0 },
    },
    activity: {
      minutesActive: { type: Number, min: 0 },
      type: { type: String, trim: true },
    },
    nutrition: {
      quality: { type: String, trim: true },
      notes: { type: String, trim: true },
    },
    wellbeingScore: {
      type: Number,
      min: 1,
      max: 10,
    },
    sentimentScore: {
      type: Number,
      min: -1,
      max: 1,
      default: 0,
    },
    patientConcerns: [{ type: String, trim: true }],
    dialogueSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DialogueSession',
      index: true,
    },
    confirmedByPatient: {
      type: Boolean,
      default: false,
      index: true,
    },
    confirmedAt: {
      type: Date,
    },
    confirmationMethod: {
      type: String,
      enum: ['VOICE_READBACK', 'MANUAL_UI', 'AUTO_TIMEOUT', 'CLINICIAN_ENTERED'],
    },
    falls: {
      reported: { type: Boolean, default: false },
      count: { type: Number, default: 0, min: 0 },
      injuryReported: { type: Boolean, default: false },
      notes: { type: String, trim: true },
    },
    mobility: {
      assistiveDeviceUsed: { type: String, trim: true },
      difficultyWalking: { type: Boolean, default: false },
      notes: { type: String, trim: true },
    },
    socialIsolation: {
      score: { type: Number, min: 1, max: 10 },
      notes: { type: String, trim: true },
    },
    medicationRefills: {
      refillNeeded: { type: Boolean, default: false },
      details: { type: String, trim: true },
    },
    weight: {
      type: mongoose.Schema.Types.Mixed,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Requirement: Add compound indexes on (patientId, timestamp) and (organizationId, patientId)
checkinSchema.index({ patientId: 1, timestamp: -1 });
checkinSchema.index({ organizationId: 1, patientId: 1, timestamp: -1 });

export const Checkin = mongoose.model('Checkin', checkinSchema);
export default Checkin;
