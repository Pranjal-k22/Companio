import { LOINC_MAPPINGS } from '../../models/Observation.js';

/**
 * ObservationExtractor extracts candidate clinical observations from speech utterances
 * and tool calls with full provenance, source quotes, and LOINC concept mappings.
 */
export class ObservationExtractor {
  /**
   * Extract observation candidate from turn transcript and context
   */
  static extractFromTranscript(transcript, sectionId, context = {}) {
    if (!transcript || typeof transcript !== 'string') return null;
    const text = transcript.trim();
    const textLower = text.toLowerCase();

    // Check for explicit patient decline or refusal
    if (
      textLower.includes("don't want to say") ||
      textLower.includes("rather not say") ||
      textLower.includes('skip this') ||
      textLower.includes('skip that') ||
      textLower.includes('prefer not to answer') ||
      textLower.includes('pass')
    ) {
      return this.buildCandidate({
        observationCode: this.resolveCodeForSection(sectionId),
        valueType: 'missing',
        missingReason: 'DECLINED',
        sourceQuote: text,
        context,
      });
    }

    // Check for "I don't know" / unknown
    if (
      textLower.includes("don't know") ||
      textLower.includes('not sure') ||
      textLower.includes("can't remember") ||
      textLower.includes('unsure')
    ) {
      return this.buildCandidate({
        observationCode: this.resolveCodeForSection(sectionId),
        valueType: 'missing',
        missingReason: 'UNKNOWN',
        sourceQuote: text,
        context,
      });
    }

    // Section-specific extraction rules:

    // 1. SLEEP DURATION
    if (sectionId === 'SLEEP' || sectionId === 'SLEEP_PATTERNS') {
      const match = textLower.match(/(\d+(?:\.\d+)?)\s*(?:hours|hrs|hour|hr)?/);
      if (match) {
        const val = parseFloat(match[1]);
        const isApprox = textLower.includes('about') || textLower.includes('around') || textLower.includes('roughly');
        return this.buildCandidate({
          observationCode: 'SLEEP_DURATION',
          observationCategory: 'sleep',
          observationDisplay: 'Sleep duration',
          valueType: 'quantity',
          valueQuantity: { value: val, unit: 'hours', isApproximate: isApprox },
          sourceQuote: text,
          context,
        });
      }
    }

    // 2. FLUID INTAKE / HYDRATION
    if (sectionId === 'HYDRATION' || sectionId === 'HYDRATION_NUTRITION') {
      const glassesMatch = textLower.match(/(\d+)\s*(?:glasses|cups|mugs)/);
      const mlMatch = textLower.match(/(\d+)\s*(?:ml|milliliters|liters|l)/);

      if (glassesMatch) {
        const val = parseInt(glassesMatch[1], 10);
        const isApprox = textLower.includes('about') || textLower.includes('around');
        return this.buildCandidate({
          observationCode: 'FLUID_INTAKE',
          observationCategory: 'hydration',
          observationDisplay: 'Oral fluid intake',
          valueType: 'quantity',
          valueQuantity: { value: val, unit: 'glasses', isApproximate: isApprox },
          sourceQuote: text,
          context,
        });
      } else if (mlMatch) {
        let val = parseInt(mlMatch[1], 10);
        if (textLower.includes('liter') && !textLower.includes('milli')) val = val * 1000;
        return this.buildCandidate({
          observationCode: 'FLUID_INTAKE',
          observationCategory: 'hydration',
          observationDisplay: 'Oral fluid intake',
          valueType: 'quantity',
          valueQuantity: { value: val, unit: 'ml', isApproximate: false },
          sourceQuote: text,
          context,
        });
      } else {
        const numOnly = textLower.match(/\b(\d+)\b/);
        if (numOnly) {
          const val = parseInt(numOnly[1], 10);
          return this.buildCandidate({
            observationCode: 'FLUID_INTAKE',
            observationCategory: 'hydration',
            observationDisplay: 'Oral fluid intake',
            valueType: 'quantity',
            valueQuantity: { value: val, unit: 'glasses', isApproximate: true },
            sourceQuote: text,
            context,
          });
        }
      }
    }

    // 3. MEDICATION ADHERENCE
    if (sectionId === 'MEDICATION_ADHERENCE' || sectionId === 'MEDICATION_ADHERENCE_TRENDS') {
      const isMissed =
        textLower.includes('missed') ||
        textLower.includes('forgot') ||
        textLower.includes("didn't take") ||
        textLower.includes('skipped') ||
        textLower.includes('ran out');

      const isTaken =
        textLower.includes('took all') ||
        textLower.includes('took them') ||
        textLower.includes('taken') ||
        textLower.includes('yes i did') ||
        textLower.includes('took my pill') ||
        textLower.includes('yes, took') ||
        textLower.includes('on time');

      if (isMissed) {
        return this.buildCandidate({
          observationCode: 'MED_ADHERENCE',
          observationCategory: 'medication',
          observationDisplay: 'Medication adherence',
          valueType: 'boolean',
          valueBoolean: false,
          valueComposite: { taken: false, missedDoses: 1, notes: text },
          sourceQuote: text,
          context,
        });
      }

      if (isTaken || textLower === 'yes' || textLower === 'yes i have') {
        return this.buildCandidate({
          observationCode: 'MED_ADHERENCE',
          observationCategory: 'medication',
          observationDisplay: 'Medication adherence',
          valueType: 'boolean',
          valueBoolean: true,
          valueComposite: { taken: true, missedDoses: 0, notes: text },
          sourceQuote: text,
          context,
        });
      }
    }

    // 4. PHYSICAL ACTIVITY
    if (sectionId === 'ACTIVITY' || sectionId === 'ACTIVITY_CHANGES') {
      const match = textLower.match(/(\d+)\s*(?:minutes|mins|min)/);
      if (match) {
        const val = parseInt(match[1], 10);
        return this.buildCandidate({
          observationCode: 'PHYSICAL_ACTIVITY',
          observationCategory: 'activity',
          observationDisplay: 'Physical activity duration',
          valueType: 'quantity',
          valueQuantity: { value: val, unit: 'minutes', isApproximate: false },
          sourceQuote: text,
          context,
        });
      }
    }

    // 5. WELLBEING SCORE
    if (sectionId === 'MOOD_WELLBEING') {
      const match = textLower.match(/(\d+)(?:\s*(?:out of 10|\/10))?/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val >= 1 && val <= 10) {
          return this.buildCandidate({
            observationCode: 'WELLBEING_SCORE',
            observationCategory: 'wellbeing',
            observationDisplay: 'General wellbeing score',
            valueType: 'quantity',
            valueQuantity: { value: val, unit: 'score_1_10', isApproximate: false },
            sourceQuote: text,
            context,
          });
        }
      }
    }

    // 6. FALLS AND NEAR-FALLS
    if (sectionId === 'FALLS_AND_NEAR_FALLS') {
      const hasFall =
        textLower.includes('fell') ||
        textLower.includes('slip') ||
        textLower.includes('stumbled') ||
        textLower.includes('trip') ||
        textLower.includes('lost my balance');

      const noFall =
        textLower.includes('no falls') ||
        textLower.includes('did not fall') ||
        textLower.includes('never fell') ||
        textLower === 'no' ||
        textLower === 'none';

      if (hasFall && !noFall) {
        return this.buildCandidate({
          observationCode: 'FALL_INCIDENT',
          observationCategory: 'safety',
          observationDisplay: 'Fall incident reported',
          valueType: 'boolean',
          valueBoolean: true,
          valueComposite: { reported: true, count: 1, notes: text },
          sourceQuote: text,
          context,
        });
      } else if (noFall) {
        return this.buildCandidate({
          observationCode: 'FALL_INCIDENT',
          observationCategory: 'safety',
          observationDisplay: 'Fall incident reported',
          valueType: 'boolean',
          valueBoolean: false,
          valueComposite: { reported: false, count: 0, notes: text },
          sourceQuote: text,
          context,
        });
      }
    }

    // 7. WEIGHT
    if (sectionId === 'WEIGHT_CHANGES') {
      const match = textLower.match(/(\d+(?:\.\d+)?)\s*(?:lbs|pounds|kg|kilos)?/);
      if (match) {
        const val = parseFloat(match[1]);
        const unit = textLower.includes('kg') ? 'kg' : 'lbs';
        return this.buildCandidate({
          observationCode: 'BODY_WEIGHT',
          observationCategory: 'vital',
          observationDisplay: 'Body weight measurement',
          valueType: 'quantity',
          valueQuantity: { value: val, unit, isApproximate: false },
          sourceQuote: text,
          context,
        });
      }
    }

    // 8. NEW SYMPTOMS / SIDE EFFECTS
    if (sectionId === 'NEW_SYMPTOMS' || sectionId === 'SIDE_EFFECTS' || sectionId === 'RECURRING_SYMPTOMS') {
      const isNegative =
        textLower.includes('no symptoms') ||
        textLower.includes('no pain') ||
        textLower.includes('none') ||
        textLower === 'no' ||
        textLower === 'no side effects';

      if (isNegative) {
        return this.buildCandidate({
          observationCode: 'ACUTE_SYMPTOM',
          observationCategory: 'symptom',
          observationDisplay: 'Reported symptoms',
          valueType: 'boolean',
          valueBoolean: false,
          sourceQuote: text,
          context,
        });
      }

      return this.buildCandidate({
        observationCode: 'ACUTE_SYMPTOM',
        observationCategory: 'symptom',
        observationDisplay: 'Reported symptom',
        valueType: 'string',
        valueString: text,
        sourceQuote: text,
        context,
      });
    }

    return null;
  }

  static resolveCodeForSection(sectionId) {
    const map = {
      MEDICATION_ADHERENCE: 'MED_ADHERENCE',
      MEDICATION_ADHERENCE_TRENDS: 'MED_ADHERENCE',
      SLEEP: 'SLEEP_DURATION',
      SLEEP_PATTERNS: 'SLEEP_DURATION',
      HYDRATION: 'FLUID_INTAKE',
      HYDRATION_NUTRITION: 'FLUID_INTAKE',
      ACTIVITY: 'PHYSICAL_ACTIVITY',
      ACTIVITY_CHANGES: 'PHYSICAL_ACTIVITY',
      MOOD_WELLBEING: 'WELLBEING_SCORE',
      FALLS_AND_NEAR_FALLS: 'FALL_INCIDENT',
      WEIGHT_CHANGES: 'BODY_WEIGHT',
      NEW_SYMPTOMS: 'ACUTE_SYMPTOM',
      SIDE_EFFECTS: 'ACUTE_SYMPTOM',
    };
    return map[sectionId] || 'GENERAL_WELLNESS';
  }

  static buildCandidate(fields) {
    const { observationCode, context = {} } = fields;
    const loinc = LOINC_MAPPINGS[observationCode] || null;

    return {
      organizationId: context.organizationId,
      patientId: context.patientId,
      conversationId: context.conversationId,
      dialogueSessionId: context.dialogueSessionId,
      turnId: context.turnId || `turn_${Date.now()}`,
      observationCode,
      observationCategory: fields.observationCategory || 'wellbeing',
      observationDisplay: fields.observationDisplay || observationCode,
      loincMapping: loinc,
      valueType: fields.valueType,
      valueQuantity: fields.valueQuantity,
      valueString: fields.valueString,
      valueBoolean: fields.valueBoolean,
      valueComposite: fields.valueComposite,
      missingReason: fields.missingReason,
      sourceQuote: fields.sourceQuote,
      sourceType: 'PATIENT_REPORTED',
      performerType: 'PATIENT',
      extractionMethod: 'DIRECT_ASSERTION',
      confirmationStatus: 'PROPOSED',
    };
  }
}

export default ObservationExtractor;

