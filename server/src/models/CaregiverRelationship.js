import mongoose from 'mongoose';

export const RELATIONSHIP_TYPES = [
  'FAMILY_MEMBER',
  'SPOUSE',
  'ADULT_CHILD',
  'SIBLING',
  'PROFESSIONAL_CAREGIVER',
  'LEGALLY_AUTHORIZED_REPRESENTATIVE',
  'OTHER',
];

export const AUTHORIZATION_TYPES = [
  'PATIENT_AUTHORIZED',
  'VERIFIED_LEGAL_AUTHORITY',
];

export const RELATIONSHIP_STATUSES = [
  'INVITED',
  'ACCEPTED',
  'ACTIVE',
  'SUSPENDED',
  'REVOKED',
  'EXPIRED',
];

const legalAuthorityVerificationSchema = new mongoose.Schema(
  {
    verificationReference: { type: String, trim: true },
    authorityBasis: {
      type: String,
      enum: ['DURABLE_POWER_OF_ATTORNEY', 'LEGAL_GUARDIANSHIP', 'HEALTHCARE_PROXY', 'COURT_ORDER', 'OTHER'],
      default: 'DURABLE_POWER_OF_ATTORNEY',
    },
    verifiedByClinicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: { type: Date },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const caregiverRelationshipSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required'],
      index: true,
    },
    caregiverUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      sparse: true,
    },
    relationshipType: {
      type: String,
      enum: {
        values: RELATIONSHIP_TYPES,
        message: 'Invalid relationship type: {VALUE}',
      },
      default: 'FAMILY_MEMBER',
      required: true,
    },
    relationshipLabel: {
      type: String,
      trim: true,
      maxlength: [100, 'Relationship label cannot exceed 100 characters'],
    },
    authorizationType: {
      type: String,
      enum: {
        values: AUTHORIZATION_TYPES,
        message: 'Invalid authorization type: {VALUE}',
      },
      default: 'PATIENT_AUTHORIZED',
      required: true,
    },
    legalAuthorityVerification: {
      type: legalAuthorityVerificationSchema,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: RELATIONSHIP_STATUSES,
        message: 'Invalid relationship status: {VALUE}',
      },
      default: 'INVITED',
      index: true,
      required: true,
    },
    invitationTokenHash: {
      type: String,
      index: true,
      sparse: true,
    },
    invitationEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    invitationPhone: {
      type: String,
      trim: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: {
      type: Date,
    },
    activatedAt: {
      type: Date,
    },
    suspendedAt: {
      type: Date,
    },
    revokedAt: {
      type: Date,
    },
    revocationReason: {
      type: String,
      trim: true,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
caregiverRelationshipSchema.index({ organizationId: 1, patientId: 1, status: 1 });
caregiverRelationshipSchema.index({ organizationId: 1, caregiverUserId: 1, status: 1 });
caregiverRelationshipSchema.index({ invitationEmail: 1, organizationId: 1, status: 1 });

export const CaregiverRelationship = mongoose.model('CaregiverRelationship', caregiverRelationshipSchema);
export default CaregiverRelationship;

