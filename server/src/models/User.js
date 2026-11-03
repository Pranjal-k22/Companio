import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'User email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    role: {
      type: String,
      enum: {
        values: ['PATIENT', 'CLINICIAN', 'ADMIN'],
        message: '{VALUE} is not a valid user role',
      },
      default: 'PATIENT',
      required: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    clinicName: {
      type: String,
      trim: true,
    },
    preferences: {
      voiceSpeed: {
        type: String,
        enum: ['slow', 'normal', 'fast'],
        default: 'normal',
      },
      notificationsEnabled: {
        type: Boolean,
        default: true,
      },
      redFlagSMS: {
        type: Boolean,
        default: true,
      },
      dailyDigest: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model('User', userSchema);
export default User;
