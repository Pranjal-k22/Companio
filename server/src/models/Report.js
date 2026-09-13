import mongoose from 'mongoose';

const flagReferenceSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    category: { type: String, required: true },
    flagId: { type: mongoose.Schema.Types.ObjectId, ref: 'Flag' },
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
    patientConcerns: [{ type: String, trim: true }],
    followUp: [{ type: String, trim: true }],
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ patientId: 1, generatedAt: -1 });

export const Report = mongoose.model('Report', reportSchema);
export default Report;
