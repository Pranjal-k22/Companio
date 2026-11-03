import mongoose from 'mongoose';

export const APPROVED_CATEGORIES = {
  RED: [
    'chest_pain',
    'severe_breathlessness',
    'stroke_signs',
    'severe_new_pain',
    'self_harm_ideation',
    'severe_allergic_reaction',
    'fall_with_injury',
    'severe_dizziness_fainting',
    'rapid_weight_loss',
    'serious_medication_reaction',
    'high_risk_medication_lapse',
    'high_fever_confusion',
    'uncontrolled_bleeding',
  ],
  YELLOW: [
    'mild_new_symptom',
    'missed_dose_or_mild_side_effect',
    'sleep_disturbance',
    'mild_mood_change',
    'appetite_or_hydration_concern',
    'reduced_activity',
    'minor_gi_issue',
    'loneliness_isolation',
    'mobility_aid_concern',
    'appointment_logistics',
  ],
};

export const ALL_APPROVED_CATEGORIES = [
  ...APPROVED_CATEGORIES.RED,
  ...APPROVED_CATEGORIES.YELLOW,
];

export const APPROVED_RED_TAXONOMY = APPROVED_CATEGORIES.RED;
export const APPROVED_YELLOW_TAXONOMY = APPROVED_CATEGORIES.YELLOW;

const safetyRuleSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null, // null denotes global system-approved rule
      index: true,
    },
    ruleId: {
      type: String,
      required: [true, 'Rule ID is required'],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Clinical category is required'],
      trim: true,
      validate: {
        validator: function (val) {
          return ALL_APPROVED_CATEGORIES.includes(val);
        },
        message: '{VALUE} is not in the approved clinical safety taxonomy',
      },
      index: true,
    },
    severity: {
      type: String,
      enum: ['red', 'yellow', 'RED', 'YELLOW'],
      required: [true, 'Severity is required'],
      lowercase: true,
      index: true,
    },
    ruleVersion: {
      type: String,
      default: '1.0',
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Clinical rule description is required'],
      trim: true,
    },
    approvedPatterns: [
      {
        pattern: { type: String, required: true },
        weight: { type: Number, default: 1.0 },
        isRegex: { type: Boolean, default: false },
      },
    ],
    matchingStrategy: {
      type: String,
      enum: ['PHRASE_MATCH', 'KEYWORD_COMBINATION', 'REGEX', 'SEMANTIC_HYBRID'],
      default: 'PHRASE_MATCH',
    },
    effectiveFrom: {
      type: Date,
      default: Date.now,
      index: true,
    },
    effectiveUntil: {
      type: Date,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'RETIRED'],
      default: 'ACTIVE',
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    clinicalReference: {
      type: String,
      trim: true,
      default: 'Companio Clinical Governance Committee',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

safetyRuleSchema.index({ organizationId: 1, ruleId: 1, ruleVersion: 1 }, { unique: true });
safetyRuleSchema.index({ status: 1, effectiveFrom: 1, effectiveUntil: 1 });

export const SafetyRule = mongoose.model('SafetyRule', safetyRuleSchema);
export default SafetyRule;
