import mongoose from 'mongoose';

const labMarkerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Marker name is required (e.g. HbA1c, LDL, eGFR)'],
      trim: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Marker test value is required'],
    },
    unit: {
      type: String,
      required: [true, 'Unit of measurement is required (e.g. mg/dL, %, mL/min)'],
      trim: true,
    },
    referenceRange: {
      type: String,
      required: [true, 'Standard reference range is required'],
      trim: true,
    },
    isOutOfRange: {
      type: Boolean,
      default: false,
    },
    flagSeverity: {
      type: String,
      enum: ['normal', 'abnormal', 'critical'],
      default: 'normal',
    },
    interpretation: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const labResultSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient reference is required for lab results'],
      index: true,
    },
    orderingClinicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    panelName: {
      type: String,
      required: [true, 'Panel title is required (e.g. Comprehensive Metabolic Panel)'],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['chemistry', 'hematology', 'cardiac', 'endocrinology', 'urinalysis', 'other'],
      default: 'chemistry',
      index: true,
    },
    collectionDate: {
      type: Date,
      required: [true, 'Sample collection date is required'],
      index: true,
    },
    reportDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['preliminary', 'final', 'amended', 'corrected'],
      default: 'final',
      index: true,
    },
    laboratory: {
      type: String,
      default: 'Quest Diagnostics / St. Jude Memorial Health Pathology Lab',
      trim: true,
    },
    markers: {
      type: [labMarkerSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'A lab panel must contain at least one clinical marker',
      },
    },
    overallImpression: {
      type: String,
      trim: true,
    },
    actionRecommended: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for time-series lab trending and abnormal flag review
labResultSchema.index({ patientId: 1, collectionDate: -1 });
labResultSchema.index({ patientId: 1, category: 1, collectionDate: -1 });

export const LabResult = mongoose.model('LabResult', labResultSchema);
export default LabResult;
