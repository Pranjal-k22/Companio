import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient reference is required for an appointment'],
      index: true,
    },
    clinicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Clinician reference is required for an appointment'],
      index: true,
    },
    doctorName: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true,
    },
    specialty: {
      type: String,
      required: [true, 'Specialty is required'],
      trim: true,
    },
    clinicLocation: {
      type: String,
      required: [true, 'Clinic location or telehealth link is required'],
      trim: true,
    },
    dateTime: {
      type: Date,
      required: [true, 'Appointment date and time are required'],
      index: true,
    },
    durationMinutes: {
      type: Number,
      default: 30,
      min: 10,
      max: 120,
    },
    type: {
      type: String,
      enum: {
        values: ['in_person', 'video_call', 'phone'],
        message: '{VALUE} is not a valid consultation type',
      },
      default: 'in_person',
    },
    status: {
      type: String,
      enum: {
        values: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'],
        message: '{VALUE} is not a valid appointment status',
      },
      default: 'scheduled',
      index: true,
    },
    reasonForVisit: {
      type: String,
      trim: true,
    },
    clinicalNotes: {
      type: String,
      trim: true,
    },
    remindersSent: {
      type: Number,
      default: 0,
    },
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

// Compound indexes for clinician schedule querying and patient timeline lookups
appointmentSchema.index({ clinicianId: 1, dateTime: 1 });
appointmentSchema.index({ patientId: 1, dateTime: 1 });
appointmentSchema.index({ status: 1, dateTime: 1 });
appointmentSchema.index({ organizationId: 1, patientId: 1, dateTime: 1 });

export const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;

