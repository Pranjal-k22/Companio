import mongoose from 'mongoose';

const medicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    frequency: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const baselineMetricsSchema = new mongoose.Schema(
  {
    weight: { type: Number, min: 0 },
    sleepHoursTarget: { type: Number, min: 0, default: 8 },
    activityGoal: { type: Number, min: 0, default: 30 }, // in minutes
    hydrationGoalMl: { type: Number, min: 0, default: 2000 },
  },
  { _id: false }
);

const patientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
    },
    age: {
      type: Number,
      required: [true, 'Patient age is required'],
      min: [0, 'Age cannot be negative'],
    },
    contact: {
      phone: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
    },
    emergencyContact: {
      name: { type: String, trim: true },
      relationship: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    medications: [medicationSchema],
    baselineMetrics: {
      type: baselineMetricsSchema,
      default: () => ({}),
    },
    assignedClinicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);



export const Patient = mongoose.model('Patient', patientSchema);
export default Patient;
