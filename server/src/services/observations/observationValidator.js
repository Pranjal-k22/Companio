/**
 * ObservationValidator validates clinical observation candidates against schema rules,
 * plausible physiological boundaries, unit constraints, and missing-value semantics.
 */

export const ALLOWED_MISSING_REASONS = [
  'NOT_ASKED',
  'DECLINED',
  'UNKNOWN',
  'UNABLE_TO_ASSESS',
  'NOT_APPLICABLE',
  'TECHNICAL_FAILURE',
];

export class ObservationValidator {
  /**
   * Validate an observation candidate
   * @param {object} candidate - Proposed observation fields
   * @returns {object} { isValid: boolean, qualityStatus: string, normalizedCandidate: object, errors: string[] }
   */
  static validate(candidate) {
    const errors = [];
    const normalized = { ...candidate };

    // 1. Mandatory Core Identifiers
    if (!normalized.organizationId) errors.push('organizationId is required');
    if (!normalized.patientId) errors.push('patientId is required');
    if (!normalized.observationCode) errors.push('observationCode is required');
    if (!normalized.valueType) errors.push('valueType is required');

    // 2. Missing Value Validation
    if (normalized.valueType === 'missing') {
      if (!normalized.missingReason || !ALLOWED_MISSING_REASONS.includes(normalized.missingReason)) {
        errors.push(`Missing value must have a valid missingReason from [${ALLOWED_MISSING_REASONS.join(', ')}]`);
      }
      // Clinical Invariant: Never convert missing value to zero!
      normalized.valueQuantity = undefined;
      normalized.qualityStatus = 'VALID';
      return {
        isValid: errors.length === 0,
        qualityStatus: 'VALID',
        normalizedCandidate: normalized,
        errors,
      };
    }

    let qualityStatus = 'VALID';

    // 3. Quantitative Bounds & Physiological Validation
    if (normalized.valueType === 'quantity') {
      const qty = normalized.valueQuantity;
      if (!qty || typeof qty.value !== 'number' || isNaN(qty.value)) {
        errors.push('valueQuantity.value must be a valid number');
      } else {
        const val = qty.value;

        switch (normalized.observationCode) {
          case 'SLEEP_DURATION':
            if (val < 0 || val > 24) {
              errors.push(`Sleep duration must be between 0 and 24 hours (received: ${val})`);
            } else if (val < 2 || val > 16) {
              qualityStatus = 'APPROXIMATE';
            }
            normalized.normalizedUnit = 'hours';
            break;

          case 'FLUID_INTAKE':
            if (val < 0 || val > 10000) {
              errors.push(`Fluid intake must be between 0 and 10,000 mL (received: ${val})`);
            }
            // If recorded in glasses, normalize to mL (1 glass = 250 mL)
            if (qty.unit === 'glasses') {
              normalized.normalizedUnit = 'ml';
              normalized.valueQuantity.normalizedValue = val * 250;
            } else {
              normalized.normalizedUnit = 'ml';
              normalized.valueQuantity.normalizedValue = val;
            }
            break;

          case 'PHYSICAL_ACTIVITY':
            if (val < 0 || val > 720) {
              errors.push(`Physical activity must be between 0 and 720 minutes (received: ${val})`);
            }
            normalized.normalizedUnit = 'minutes';
            break;

          case 'PAIN_SEVERITY':
            if (val < 0 || val > 10) {
              errors.push(`Pain severity must be between 0 and 10 (received: ${val})`);
            }
            normalized.normalizedUnit = 'score_0_10';
            break;

          case 'WELLBEING_SCORE':
            if (val < 1 || val > 10) {
              errors.push(`Wellbeing score must be between 1 and 10 (received: ${val})`);
            }
            normalized.normalizedUnit = 'score_1_10';
            break;

          case 'BODY_WEIGHT':
            if (val <= 0 || val > 500) {
              errors.push(`Body weight must be between 1 and 500 (received: ${val})`);
            }
            normalized.normalizedUnit = qty.unit === 'lbs' ? 'lbs' : 'kg';
            break;

          default:
            break;
        }
      }
    }

    // 4. Boolean Validation
    if (normalized.valueType === 'boolean' && typeof normalized.valueBoolean !== 'boolean') {
      errors.push('valueBoolean must be a boolean');
    }

    // 5. String Validation
    if (normalized.valueType === 'string' && (typeof normalized.valueString !== 'string' || !normalized.valueString.trim())) {
      errors.push('valueString must be a non-empty string');
    }

    // 6. Provenance Validation
    if (!normalized.sourceType) {
      normalized.sourceType = 'PATIENT_REPORTED';
    }

    normalized.qualityStatus = qualityStatus;

    return {
      isValid: errors.length === 0,
      qualityStatus,
      normalizedCandidate: normalized,
      errors,
    };
  }
}

export default ObservationValidator;
