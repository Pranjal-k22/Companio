import mongoose from 'mongoose';

/**
 * Standardized LOINC Mapping Dictionary
 * Maps internal clinical observation concepts to standardized LOINC codes.
 */
export const LOINC_MAPPINGS = {
  MED_ADHERENCE: { code: '59556-1', display: 'Medication adherence', system: 'http://loinc.org' },
  SLEEP_DURATION: { code: '93832-4', display: 'Sleep duration', system: 'http://loinc.org' },
  SLEEP_QUALITY: { code: '93831-6', display: 'Sleep quality', system: 'http://loinc.org' },
  FLUID_INTAKE: { code: '9052-2', display: 'Oral fluid intake 24 hour', system: 'http://loinc.org' },
  PHYSICAL_ACTIVITY: { code: '89555-7', display: 'Physical activity [Time] Per day', system: 'http://loinc.org' },
  PAIN_SEVERITY: { code: '72514-3', display: 'Pain severity - 0-10 verbal numeric rating', system: 'http://loinc.org' },
  WELLBEING_SCORE: { code: '71802-3', display: 'General well-being score', system: 'http://loinc.org' },
  FALL_INCIDENT: { code: '87625-0', display: 'Falls in the past year', system: 'http://loinc.org' },
  BODY_WEIGHT: { code: '29463-7', display: 'Body weight', system: 'http://loinc.org' },
  SOCIAL_ISOLATION: { code: '93033-9', display: 'Social isolation score', system: 'http://loinc.org' },
  MED_REFILL: { code: '67711-2', display: 'Medication refill status', system: 'http://loinc.org' },
  MOBILITY_STATUS: { code: '89383-4', display: 'Mobility score', system: 'http://loinc.org' },
  ACUTE_SYMPTOM: { code: '75325-1', display: 'Symptom', system: 'http://loinc.org' },
};

const observationSchema = new mongoose.Schema(
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
    observationCode: {
      type: String,
      required: [true, 'Observation code is required'],
      index: true,
      trim: true,
    },
    observationCategory: {
      type: String,
      enum: [
        'medication',
        'symptom',
        'sleep',
        'hydration',
        'activity',
        'nutrition',
        'wellbeing',
        'safety',
        'social',
        'logistics',
        'vital',
      ],
      required: true,
      index: true,
    },
    observationDisplay: {
      type: String,
      required: true,
      trim: true,
    },
    loincMapping: {
      code: { type: String, trim: true },
      display: { type: String, trim: true },
      system: { type: String, default: 'http://loinc.org' },
    },
    valueType: {
      type: String,
      enum: ['quantity', 'string', 'boolean', 'composite', 'missing'],
      required: true,
    },
    valueQuantity: {
      value: { type: Number },
      unit: { type: String, trim: true },
      isApproximate: { type: Boolean, default: false },
    },
    valueString: {
      type: String,
      trim: true,
    },
    valueBoolean: {
      type: Boolean,
    },
    valueComposite: {
      type: mongoose.Schema.Types.Mixed,
    },
    missingReason: {
      type: String,
      enum: [
        'NOT_ASKED',
        'DECLINED',
        'UNKNOWN',
        'UNABLE_TO_ASSESS',
        'NOT_APPLICABLE',
        'TECHNICAL_FAILURE',
      ],
    },
    originalUnit: {
      type: String,
      trim: true,
    },
    normalizedUnit: {
      type: String,
      trim: true,
    },
    effectiveDateTime: {
      type: Date,
      default: Date.now,
      index: true,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    sourceType: {
      type: String,
      enum: [
        'PATIENT_REPORTED',
        'CLINICIAN_ENTERED',
        'DEVICE_MEASURED',
        'EXTERNAL_IMPORT',
        'SYSTEM_DERIVED',
        'CAREGIVER_REPORTED',
      ],
      default: 'PATIENT_REPORTED',
      required: true,
    },
    performerType: {
      type: String,
      enum: ['PATIENT', 'CLINICIAN', 'SYSTEM', 'CAREGIVER'],
      default: 'PATIENT',
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      index: true,
    },
    checkinId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Checkin',
      index: true,
    },
    dialogueSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DialogueSession',
      index: true,
    },
    turnId: {
      type: String,
      trim: true,
    },
    sourceQuote: {
      type: String,
      trim: true,
    },
    extractionMethod: {
      type: String,
      enum: ['AI_EXTRACTED', 'DIRECT_ASSERTION', 'RULE_DERIVED', 'FALLBACK_NLP'],
      default: 'AI_EXTRACTED',
    },
    qualityStatus: {
      type: String,
      enum: ['VALID', 'OUT_OF_RANGE', 'AMBIGUOUS', 'CONTRADICTED', 'APPROXIMATE'],
      default: 'VALID',
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ['UNVERIFIED', 'VERIFIED', 'REJECTED'],
      default: 'UNVERIFIED',
    },
    confirmationStatus: {
      type: String,
      enum: ['PROPOSED', 'CONFIRMED', 'DISPUTED', 'RETRACTED'],
      default: 'PROPOSED',
      index: true,
    },
    supersedesObservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Observation',
    },
    correctionReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for time-series queries and tenant authorization
observationSchema.index({ organizationId: 1, patientId: 1, effectiveDateTime: -1 });
observationSchema.index({ dialogueSessionId: 1, confirmationStatus: 1 });
observationSchema.index({ patientId: 1, observationCode: 1, effectiveDateTime: -1 });

export const Observation = mongoose.model('Observation', observationSchema);
export default Observation;

