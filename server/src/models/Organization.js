import mongoose from 'mongoose';

/**
 * Organization Schema
 * Represents a hospital, clinic, healthcare system, or home care agency in Companio.
 */
const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [100, 'Organization name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Organization slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug must only contain lowercase alphanumeric characters and hyphens'],
      index: true,
    },
    legalName: {
      type: String,
      trim: true,
      maxlength: [150, 'Legal name cannot exceed 150 characters'],
    },
    organizationType: {
      type: String,
      enum: {
        values: ['hospital', 'clinic', 'health_system', 'home_care', 'research', 'other'],
        message: '{VALUE} is not a valid organization type',
      },
      default: 'clinic',
      required: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
    },
    contactEmail: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid contact email'],
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      postalCode: { type: String, trim: true },
      country: { type: String, trim: true, default: 'USA' },
    },
    timezone: {
      type: String,
      default: 'America/New_York',
      trim: true,
    },
    defaultLanguage: {
      type: String,
      default: 'en-US',
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'suspended', 'inactive'],
        message: '{VALUE} is not a valid organization status',
      },
      default: 'active',
      index: true,
    },
    subscriptionPlan: {
      planId: { type: String, default: 'standard_tier' },
      status: { type: String, default: 'active' },
      maxMembers: { type: Number, default: 50 },
      maxPatients: { type: Number, default: 500 },
    },
    settings: {
      allowCaregiverInvites: { type: Boolean, default: true },
      escalationPolicy: {
        emailAlerts: { type: Boolean, default: true },
        smsAlerts: { type: Boolean, default: false },
        clinicianOnCallPhone: { type: String, trim: true },
      },
      retentionDays: { type: Number, default: 365 },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
organizationSchema.index({ status: 1, slug: 1 });
organizationSchema.index({ createdAt: -1 });

// Safe public JSON serialization - strips sensitive internals
organizationSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  return {
    id: obj._id.toString(),
    name: obj.name,
    slug: obj.slug,
    legalName: obj.legalName,
    organizationType: obj.organizationType,
    registrationNumber: obj.registrationNumber,
    contactEmail: obj.contactEmail,
    contactPhone: obj.contactPhone,
    address: obj.address,
    timezone: obj.timezone,
    defaultLanguage: obj.defaultLanguage,
    status: obj.status,
    subscriptionPlan: obj.subscriptionPlan,
    settings: obj.settings,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

export const Organization = mongoose.model('Organization', organizationSchema);
export default Organization;
