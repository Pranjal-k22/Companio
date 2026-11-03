import mongoose from 'mongoose';
import { SafetyRule, APPROVED_CATEGORIES, ALL_APPROVED_CATEGORIES } from '../../models/SafetyRule.js';
import { ValidationError, AuthorizationError } from '../../errors/AppError.js';

/**
 * Standard Evidence-Based Clinical Seed Rules
 * Mapped to the approved 13 RED and 10 YELLOW categories.
 */
export const DEFAULT_SAFETY_RULES = [
  // --- 13 RED HIGH-SEVERITY RULES ---
  {
    ruleId: 'RULE_RED_CHEST_PAIN_V1',
    category: 'chest_pain',
    severity: 'red',
    ruleVersion: '1.0',
    description: 'Acute chest pain, pressure, squeezing, or heaviness suggesting myocardial ischemia.',
    clinicalReference: 'AHA/ACC Guideline for the Evaluation and Diagnosis of Chest Pain',
    matchingStrategy: 'PHRASE_MATCH',
    approvedPatterns: [
      { pattern: 'chest pain' },
      { pattern: 'chest hurts' },
      { pattern: 'chest tightness' },
      { pattern: 'pressure in my chest' },
      { pattern: 'tightness in my chest' },
      { pattern: 'heavy chest' },
      { pattern: 'squeezing in my chest' },
      { pattern: 'crushing chest pain' },
      { pattern: 'pain radiating to my left arm' },
    ],
  },
  {
    ruleId: 'RULE_RED_SEVERE_BREATHLESSNESS_V1',
    category: 'severe_breathlessness',
    severity: 'red',
    ruleVersion: '1.0',
    description: 'Acute severe shortness of breath or respiratory distress.',
    clinicalReference: 'ATS/ERS Standards for Diagnosis and Care of Respiratory Distress',
    matchingStrategy: 'PHRASE_MATCH',
    approvedPatterns: [
      { pattern: "can't breathe" },
      { pattern: 'cannot breathe' },
      { pattern: "can't catch my breath" },
      { pattern: 'trouble breathing' },
      { pattern: 'gasping for air' },
      { pattern: 'severe shortness of breath' },
      { pattern: 'suffocating' },
    ],
  },
  {
    ruleId: 'RULE_RED_STROKE_SIGNS_V1',
    category: 'stroke_signs',
    severity: 'red',
    ruleVersion: '1.0',
    description: 'Sudden neurological deficit, facial droop, arm weakness, or slurred speech (FAST).',
    clinicalReference: 'AHA/ASA Early Management of Patients With Acute Ischemic Stroke',
    matchingStrategy: 'PHRASE_MATCH',
    approvedPatterns: [
      { pattern: "can't feel my face" },
      { pattern: 'face feels numb' },
      { pattern: 'face is drooping' },
      { pattern: "can't talk right" },
      { pattern: 'one side is weak' },
      { pattern: 'slurred speech' },
      { pattern: 'sudden loss of vision' },
      { pattern: 'arm went limp' },
    ],
  },
  {
    ruleId: 'RULE_RED_SEVERE_NEW_PAIN_V1',
    category: 'severe_new_pain',
    severity: 'red',
    ruleVersion: '1.0',
    description: 'Sudden onset severe, unbearable, or incapacitating pain.',
    clinicalReference: 'WHO Pain Assessment and Emergency Triage Protocol',
    matchingStrategy: 'PHRASE_MATCH',
    approvedPatterns: [
      { pattern: 'worst pain of my life' },
      { pattern: 'unbearable pain' },
      { pattern: 'excruciating pain' },
      { pattern: 'severe sudden pain' },
      { pattern: 'thunderclap headache' },
    ],
  },
  {
    ruleId: 'RULE_RED_SELF_HARM_IDEATION_V1',
    category: 'self_harm_ideation',
    severity: 'red',
    ruleVersion: '1.0',
    description: 'Explicit or implicit suicidal or self-harm ideation.',
    clinicalReference: 'Columbia-Suicide Severity Rating Scale (C-SSRS)',
    matchingStrategy: 'PHRASE_MATCH',
    approvedPatterns: [
      { pattern: 'want to hurt myself' },
      { pattern: "don't want to be here" },
      { pattern: 'end it all' },
      { pattern: 'no reason to live' },
      { pattern: 'better off dead' },
      { pattern: 'thinking of ending my life' },
    ],
  },
  {
    ruleId: 'RULE_RED_SEVERE_ALLERGIC_REACTION_V1',
    category: 'severe_allergic_reaction',
    severity: 'red',
    ruleVersion: '1.0',
    description: 'Symptoms of systemic anaphylaxis including airway constriction or swelling.',
    clinicalReference: 'WAO Guidelines for Anaphylaxis Assessment and Management',
    matchingStrategy: 'PHRASE_MATCH',
    approvedPatterns: [
      { pattern: 'throat is closing' },
      { pattern: 'tongue is swelling' },
      { pattern: 'lips are swollen' },
      { pattern: 'anaphylaxis' },
      { pattern: 'severe allergic reaction' },
    ],
  },
  {
    ruleId: 'RULE_RED_FALL_WITH_INJURY_V1',
    category: 'fall_with_injury',
    severity: 'red',
    ruleVersion: '1.0',
    description: 'Fall resulting in head impact, immobility, or suspected fracture in older adult.',
    clinicalReference: 'CDC STEADI Fall Prevention & Management for Older Adults',
    matchingStrategy: 'PHRASE_MATCH',
    approvedPatterns: [
      { pattern: "fell and can't get up" },
      { pattern: "fell and i'm hurt" },
      { pattern: 'fell and hurt my' },
      { pattern: 'hit my head when i fell' },
      { pattern: 'fell and cannot walk' },
    ],
  },
  {
    ruleId: 'RULE_RED_SEVERE_DIZZINESS_FAINTING_V1',
    category: 'severe_dizziness_fainting',
    severity: 'red',
    ruleVersion: '1.0',
    description: 'Syncope, loss of consciousness, or acute incapacitating vertigo.',
    clinicalReference: 'ESC Guidelines for the Diagnosis and Management of Syncope',
    matchingStrategy: 'PHRASE_MATCH',
    approvedPatterns: [
      { pattern: 'passed out' },
      { pattern: 'blacked out' },
      { pattern: 'everything went dark' },
      { pattern: 'fainted' },
      { pattern: 'lost consciousness' },
    ],
  },
  {
    ruleId: 'RULE_RED_RAPID_WEIGHT_LOSS_V1',
    category: 'rapid_weight_loss',
    severity: 'red',
    ruleVersion: '1.0',
    description: 'Severe, unexpected weight loss over short duration in geriatric patient.',
    clinicalReference: 'Geriatric Nutritional Assessment Consensus Guidelines',
    matchingStrategy: 'PHRASE_MATCH',
    approvedPatterns: [
      { pattern: 'dropped ten pounds this week' },
      { pattern: 'lost a lot of weight suddenly' },
      { pattern: 'clothes are falling off me' },
      { pattern: 'rapid weight loss' },
    ],
  },
  {
    ruleId: 'RULE_RED_SERIOUS_MED_REACTION_V1',
    category: 'serious_medication_reaction',
    severity: 'red',
    ruleVersion: '1.0',
    description: 'Acute severe adverse drug reaction, rash with peeling, or drug-induced arrhythmia.',
    clinicalReference: 'FDA MedWatch Adverse Event Reporting Criteria',
    matchingStrategy: 'PHRASE_MATCH',
    approvedPatterns: [
      { pattern: 'bad reaction to my medicine' },
      { pattern: 'skin is peeling from the pills' },
      { pattern: 'pill made my heart race wildly' },
      { pattern: 'hallucinating from new medicine' },
    ],
  },
  {
    ruleId: 'RULE_RED_HIGH_RISK_MED_LAPSE_V1',
    category: 'high_risk_medication_lapse',
    severity: 'red',
    ruleVersion: '1.0',
    description: 'Lapse in critical, high-risk medications (anticoagulants, insulin, anti-rejection).',
    clinicalReference: 'ISMP High-Alert Medications in Community/Ambulatory Settings',
    matchingStrategy: 'PHRASE_MATCH',
    approvedPatterns: [
      { pattern: 'out of insulin for three days' },
      { pattern: 'stopped taking my blood thinner' },
      { pattern: 'missed my Eliquis for days' },
      { pattern: 'missed my Warfarin' },
    ],
  },
  {
    ruleId: 'RULE_RED_HIGH_FEVER_CONFUSION_V1',
    category: 'high_fever_confusion',
    severity: 'red',
    ruleVersion: '1.0',
    description: 'High fever accompanied by acute confusion or delirium (possible sepsis or meningitis).',
    clinicalReference: 'Surviving Sepsis Campaign Geriatric Infection Protocol',
    matchingStrategy: 'PHRASE_MATCH',
    approvedPatterns: [
      { pattern: 'burning up and confused' },
      { pattern: 'high fever and shaking' },
      { pattern: 'delirious with fever' },
      { pattern: 'temperature is 103' },
    ],
  },
  {
    ruleId: 'RULE_RED_UNCONTROLLED_BLEEDING_V1',
    category: 'uncontrolled_bleeding',
    severity: 'red',
    ruleVersion: '1.0',
    description: 'Uncontrolled hemorrhage, vomiting blood, or active bleeding not stopping with pressure.',
    clinicalReference: 'American College of Surgeons Stop the Bleed Consensus',
    matchingStrategy: 'PHRASE_MATCH',
    approvedPatterns: [
      { pattern: "won't stop bleeding" },
      { pattern: 'bleeding a lot' },
      { pattern: 'gushing blood' },
      { pattern: 'coughing up blood' },
      { pattern: 'vomiting blood' },
    ],
  },

  // --- 10 YELLOW MODERATE-SEVERITY RULES ---
  {
    ruleId: 'RULE_YELLOW_MILD_NEW_SYMPTOM_V1',
    category: 'mild_new_symptom',
    severity: 'yellow',
    ruleVersion: '1.0',
    description: 'New mild symptoms requiring non-urgent clinical follow-up.',
    clinicalReference: 'Ambulatory Care Non-Urgent Symptom Triage Guidelines',
    matchingStrategy: 'PHRASE_MATCH',
    approvedPatterns: [
      { pattern: 'knee stiffness' },
      { pattern: 'joint pain' },
      { pattern: 'mild headache' },
      { pattern: 'stiff neck' },
      { pattern: 'slight cough' },
      { pattern: 'minor rash' },
    ],
  },
  {
    ruleId: 'RULE_YELLOW_MISSED_DOSE_MILD_SIDE_EFFECT_V1',
    category: 'missed_dose_or_mild_side_effect',
    severity: 'yellow',
    ruleVersion: '1.0',
    description: 'Single missed dose or minor predictable drug side effect.',
    clinicalReference: 'Pharmacotherapy Medication Adherence Follow-up Protocol',
    matchingStrategy: 'PHRASE_MATCH',
    approvedPatterns: [
      { pattern: 'missed my pill' },
      { pattern: 'missed my dose' },
      { pattern: 'forgot my medication' },
      { pattern: 'forgot my morning dose' },
      { pattern: 'slight dry mouth from the medicine' },
      { pattern: 'mild stomach upset after pill' },
    ],
  },
  {
    ruleId: 'RULE_YELLOW_SLEEP_DISTURBANCE_V1',
    category: 'sleep_disturbance',
    severity: 'yellow',
    ruleVersion: '1.0',
    description: 'Insomnia, frequent waking, or non-restorative sleep.',
    clinicalReference: 'AASM Clinical Practice Guideline for Chronic Insomnia in Older Adults',
    matchingStrategy: 'PHRASE_MATCH',
    approvedPatterns: [
      { pattern: 'poor sleep' },
      { pattern: "couldn't sleep at all" },
      { pattern: 'waking up constantly' },
      { pattern: 'tossing and turning' },
    ],
  },
  {
    ruleId: 'RULE_YELLOW_MILD_MOOD_CHANGE_V1',
    category: 'mild_mood_change',
    severity: 'yellow',
    ruleVersion: '1.0',
    description: 'Sub-syndromal low mood, mild anxiety, or reduced motivation.',
    clinicalReference: 'PHQ-9 Geriatric Depression Screening Consensus',
    matchingStrategy: 'PHRASE_MATCH',
    approvedPatterns: [
      { pattern: 'feeling a bit down' },
      { pattern: 'feeling a little blue' },
      { pattern: 'mildly anxious' },
      { pattern: 'having an off day' },
    ],
  },
  {
    ruleId: 'RULE_YELLOW_APPETITE_HYDRATION_V1',
    category: 'appetite_or_hydration_concern',
    severity: 'yellow',
    ruleVersion: '1.0',
    description: 'Mildly decreased fluid or dietary intake over 24-48 hours.',
    clinicalReference: 'Geriatric Dehydration Risk Assessment',
    matchingStrategy: 'PHRASE_MATCH',
    approvedPatterns: [
      { pattern: 'not very hungry' },
      { pattern: "haven't drank much water" },
      { pattern: 'skipped lunch today' },
      { pattern: 'dry mouth and thirsty' },
    ],
  },
  {
    ruleId: 'RULE_YELLOW_REDUCED_ACTIVITY_V1',
    category: 'reduced_activity',
    severity: 'yellow',
    ruleVersion: '1.0',
    description: 'Patient reports moving less or skipping daily walking routine.',
    clinicalReference: 'Physical Activity Guidelines for Older Adults',
    matchingStrategy: 'PHRASE_MATCH',
    approvedPatterns: [
      { pattern: "didn't go for my walk" },
      { pattern: 'stayed in bed all day' },
      { pattern: 'too sluggish to move' },
      { pattern: 'less active than usual' },
    ],
  },
  {
    ruleId: 'RULE_YELLOW_MINOR_GI_ISSUE_V1',
    category: 'minor_gi_issue',
    severity: 'yellow',
    ruleVersion: '1.0',
    description: 'Mild non-acute gastrointestinal symptoms (mild nausea, constipation).',
    clinicalReference: 'Geriatric Constipation and Dyspepsia Guidelines',
    matchingStrategy: 'PHRASE_MATCH',
    approvedPatterns: [
      { pattern: 'a little constipated' },
      { pattern: 'mild nausea' },
      { pattern: 'upset stomach' },
      { pattern: 'mild heartburn' },
    ],
  },
  {
    ruleId: 'RULE_YELLOW_LONELINESS_ISOLATION_V1',
    category: 'loneliness_isolation',
    severity: 'yellow',
    ruleVersion: '1.0',
    description: 'Social isolation or feelings of chronic loneliness.',
    clinicalReference: 'National Academies Social Isolation and Loneliness in Older Adults',
    matchingStrategy: 'PHRASE_MATCH',
    approvedPatterns: [
      { pattern: 'feeling very lonely' },
      { pattern: 'haven\'t spoken to anyone in days' },
      { pattern: 'nobody ever visits' },
      { pattern: 'all alone in the house' },
    ],
  },
  {
    ruleId: 'RULE_YELLOW_MOBILITY_AID_CONCERN_V1',
    category: 'mobility_aid_concern',
    severity: 'yellow',
    ruleVersion: '1.0',
    description: 'Issues with walker, cane, wheelchair, or home environment safety.',
    clinicalReference: 'Assistive Device Safety in Elderly Populations',
    matchingStrategy: 'PHRASE_MATCH',
    approvedPatterns: [
      { pattern: 'my walker is wobbly' },
      { pattern: 'cane rubber tip is worn out' },
      { pattern: 'trouble getting out of chair' },
      { pattern: 'lost my cane' },
    ],
  },
  {
    ruleId: 'RULE_YELLOW_APPOINTMENT_LOGISTICS_V1',
    category: 'appointment_logistics',
    severity: 'yellow',
    ruleVersion: '1.0',
    description: 'Logistical or transportation barriers to attending doctor visits.',
    clinicalReference: 'Healthcare Access and Non-Emergency Medical Transportation Protocols',
    matchingStrategy: 'PHRASE_MATCH',
    approvedPatterns: [
      { pattern: 'no ride to the doctor' },
      { pattern: 'cannot get to my appointment' },
      { pattern: 'need help with transportation' },
      { pattern: 'missed my clinic appointment' },
    ],
  },
];

class SafetyRuleRegistry {
  constructor() {
    // Map<ruleId, SafetyRule>
    this.inMemoryRules = new Map();
    this.isInitialized = false;
    this._loadDefaultRules();
  }

  _loadDefaultRules() {
    for (const rule of DEFAULT_SAFETY_RULES) {
      this.inMemoryRules.set(rule.ruleId, {
        ...rule,
        status: 'ACTIVE',
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: null,
      });
    }
    this.isInitialized = true;
  }

  /**
   * Initializes or syncs safety rules from database
   */
  async syncFromDatabase() {
    try {
      const dbRules = await SafetyRule.find({ status: 'ACTIVE' }).lean();
      for (const rule of dbRules) {
        this.inMemoryRules.set(rule.ruleId, rule);
      }
    } catch (e) {
      console.warn('[SafetyRuleRegistry] DB sync warning (operating in cached default mode):', e.message);
    }
  }

  /**
   * Retrieves active, currently effective safety rules for a given organization (including global rules)
   */
  getActiveRules(organizationId = null) {
    const now = new Date();
    const orgIdStr = organizationId ? organizationId.toString() : null;

    const matched = [];
    for (const rule of this.inMemoryRules.values()) {
      if (rule.status !== 'ACTIVE') continue;

      // Effective window check
      if (rule.effectiveFrom && new Date(rule.effectiveFrom) > now) continue;
      if (rule.effectiveUntil && new Date(rule.effectiveUntil) < now) continue;

      // Organization scope check (global rules where organizationId is null, or matching org)
      const ruleOrgStr = rule.organizationId ? rule.organizationId.toString() : null;
      if (ruleOrgStr === null || ruleOrgStr === orgIdStr) {
        matched.push(rule);
      }
    }

    return matched;
  }

  /**
   * Registers a new or updated clinical rule with mandatory clinical governance authorization
   */
  async registerRule(ruleData, actorUser) {
    if (!actorUser || !['CLINICIAN', 'ADMIN', 'ORG_OWNER', 'ORG_ADMIN'].includes(actorUser.role)) {
      throw new AuthorizationError('Only authorized clinical administrators may register or update safety rules.');
    }

    if (!ALL_APPROVED_CATEGORIES.includes(ruleData.category)) {
      throw new ValidationError(`Category '${ruleData.category}' is not an approved clinical taxonomy category.`);
    }

    const ruleRecord = {
      ...ruleData,
      approvedBy: actorUser._id || actorUser.id,
      status: ruleData.status || 'ACTIVE',
      effectiveFrom: ruleData.effectiveFrom || new Date(),
    };

    this.inMemoryRules.set(ruleData.ruleId, ruleRecord);

    if (mongoose.connection?.readyState === 1) {
      try {
        await SafetyRule.findOneAndUpdate(
          { ruleId: ruleData.ruleId, organizationId: ruleData.organizationId || null },
          ruleRecord,
          { upsert: true, new: true }
        );
      } catch (e) {
        console.warn('[SafetyRuleRegistry] Note: DB persistence skipped:', e.message);
      }
    }

    return ruleRecord;
  }

  /**
   * Retires a clinical rule
   */
  async retireRule(ruleId, actorUser) {
    if (!actorUser || !['CLINICIAN', 'ADMIN', 'ORG_OWNER', 'ORG_ADMIN'].includes(actorUser.role)) {
      throw new AuthorizationError('Only authorized clinical administrators may retire safety rules.');
    }

    const existing = this.inMemoryRules.get(ruleId);
    if (existing) {
      existing.status = 'RETIRED';
      existing.effectiveUntil = new Date();
      this.inMemoryRules.set(ruleId, existing);
    }

    if (mongoose.connection?.readyState === 1) {
      try {
        await SafetyRule.findOneAndUpdate(
          { ruleId },
          { status: 'RETIRED', effectiveUntil: new Date() }
        );
      } catch (e) {}
    }

    return { ruleId, status: 'RETIRED' };
  }

  isCategoryApproved(category) {
    return ALL_APPROVED_CATEGORIES.includes(category);
  }

  getApprovedCategories() {
    return { ...APPROVED_CATEGORIES };
  }
}

export const safetyRuleRegistry = new SafetyRuleRegistry();
export default safetyRuleRegistry;
