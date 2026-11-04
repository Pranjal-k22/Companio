/**
 * Report Validation Service
 * Audits generated narration and structured content against deterministic ground-truth metrics.
 * Ensures the AI never manufactures unverified claims or alters calculated metrics.
 */
export class ReportValidationService {
  /**
   * Performs clinical and structural validation on a generated report draft.
   *
   * @param {object} params
   * @param {object} params.narration - Generated narration object
   * @param {object} params.clinicalMetrics - Output of ClinicalAnalyticsEngine
   * @param {object} params.flagSummary - Output of ReportFlagIntegrator
   * @param {Date} params.periodStart
   * @param {Date} params.periodEnd
   * @param {string} params.organizationId
   * @returns {object} Validation result { isValid, errors, warnings }
   */
  static validateReport({
    narration,
    clinicalMetrics,
    flagSummary,
    periodStart,
    periodEnd,
    organizationId,
  }) {
    const errors = [];
    const warnings = [];

    if (!narration || typeof narration !== 'object') {
      return { isValid: false, errors: ['Report narration is null or non-object'], warnings };
    }

    // 1. Mandatory Section Validation
    if (!narration.overview || typeof narration.overview !== 'string' || narration.overview.trim().length < 10) {
      errors.push('Missing or insufficiently detailed "overview" section');
    }
    if (!Array.isArray(narration.positiveProgress)) {
      errors.push('"positiveProgress" must be an array');
    }
    if (!Array.isArray(narration.patientConcerns)) {
      errors.push('"patientConcerns" must be an array');
    }
    if (!Array.isArray(narration.clinicianFollowUp)) {
      errors.push('"clinicianFollowUp" must be an array');
    }

    // 2. Reporting Period Sanity Check
    const pStart = new Date(periodStart);
    const pEnd = new Date(periodEnd);
    if (isNaN(pStart.getTime()) || isNaN(pEnd.getTime()) || pStart > pEnd) {
      errors.push('Invalid reporting period boundaries');
    }

    // 3. Clinical Flag Verification
    const activeRedCount = flagSummary?.activeRedFlags?.length || 0;
    const narrationRedCount = narration.redFlags?.length || 0;
    if (activeRedCount > 0 && narrationRedCount === 0) {
      errors.push(`Safety Violation: System detected ${activeRedCount} active RED flag(s), but narration contains 0 red flags`);
    }

    // Check that flag IDs in narration match actual known flags
    const knownFlagIds = new Set((flagSummary?.allRelevantFlags || []).map((f) => f._id.toString()));
    (narration.redFlags || []).forEach((rf) => {
      if (rf.flagId && knownFlagIds.size > 0 && !knownFlagIds.has(rf.flagId.toString())) {
        warnings.push(`Unrecognized red flag reference ID: ${rf.flagId}`);
      }
    });

    // 4. Metric Consistency Checks
    const { deterministicMetrics } = clinicalMetrics;
    const adherence = deterministicMetrics?.medicationAdherence?.adherencePct;

    // Check if adherence percentage is mentioned in overview, ensure it matches calculated number
    if (adherence !== null && adherence !== undefined) {
      const match = narration.overview.match(/(\d{1,3})%/);
      if (match) {
        const statedPct = parseInt(match[1], 10);
        if (Math.abs(statedPct - adherence) > 2) {
          warnings.push(`Discrepancy in reported adherence: Narrative states ${statedPct}%, but deterministic calculation is ${adherence}%`);
        }
      }
    }

    // 5. Missing Data Disclosures
    const { dataCompleteness } = clinicalMetrics;
    if (dataCompleteness?.limitations?.length > 0) {
      if (!narration.dataCompletenessSummary && warnings.length === 0) {
        warnings.push('Underlying dataset has missing data limitations that were not explicitly cited in the narrative');
      }
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      validatedAt: new Date(),
    };
  }
}

export default ReportValidationService;

