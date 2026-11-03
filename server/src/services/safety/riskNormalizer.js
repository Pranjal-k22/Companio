import { ALL_APPROVED_CATEGORIES, APPROVED_CATEGORIES } from '../../models/SafetyRule.js';
import { ValidationError } from '../../errors/AppError.js';

/**
 * Standardized Clinical Risk Normalizer
 * Unifies detection signals from both the deterministic keyword safety net and LLM tool calls.
 */
export class RiskNormalizer {
  /**
   * Normalizes a raw detection input into a canonical risk signal
   * 
   * @param {object} rawSignal
   * @param {string} rawSignal.source - 'keyword_safety_net' | 'llm_tool'
   * @param {string} rawSignal.category - Clinical taxonomy category
   * @param {string} rawSignal.severity - 'red' | 'yellow'
   * @param {string} [rawSignal.evidenceText] - Supporting quote
   * @param {string} [rawSignal.matchedPattern] - Specific rule phrase that matched
   * @param {string} [rawSignal.ruleId] - Correlated rule ID
   * @param {string} [rawSignal.ruleVersion] - Rule version
   * @param {object} [rawSignal.sessionContext] - Session metadata containing patientId, organizationId, conversationId, turnId
   * @param {object} [rawSignal.contextAnalysis] - Output from contextAnalyzer
   * @returns {object} Canonical NormalizedRiskSignal
   */
  static normalizeSignal(rawSignal) {
    const {
      source = 'keyword_safety_net',
      category,
      severity,
      evidenceText = '',
      matchedPattern = null,
      ruleId = null,
      ruleVersion = '1.0',
      sessionContext = {},
      contextAnalysis = {},
      detectionConfidence = null,
    } = rawSignal;

    if (!category) {
      throw new ValidationError('Risk signal requires a valid clinical category.');
    }

    // Validate category against approved taxonomy
    const normCategory = category.toLowerCase().trim();
    if (!ALL_APPROVED_CATEGORIES.includes(normCategory)) {
      throw new ValidationError(`Category '${category}' does not exist in the approved clinical taxonomy.`);
    }

    // Strict severity mapping based on taxonomy
    const canonicalSeverity = APPROVED_CATEGORIES.RED.includes(normCategory) ? 'red' : 'yellow';

    const patientId = sessionContext.patientId ? sessionContext.patientId.toString() : null;
    const organizationId = sessionContext.organizationId ? sessionContext.organizationId.toString() : null;
    const conversationId = sessionContext.conversationId ? sessionContext.conversationId.toString() : null;
    const turnId = sessionContext.turnId || null;

    const evidence = [];
    if (evidenceText || matchedPattern) {
      evidence.push({
        source,
        text: evidenceText || matchedPattern || '',
        matchedPattern: matchedPattern || undefined,
        ruleId: ruleId || undefined,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      patientId,
      organizationId,
      conversationId,
      turnId,
      category: normCategory,
      severity: canonicalSeverity,
      sources: [source],
      evidence,
      ruleId: ruleId || `RULE_${canonicalSeverity.toUpperCase()}_${normCategory.toUpperCase()}_V1`,
      ruleVersion,
      detectionConfidence: typeof detectionConfidence === 'number' ? detectionConfidence : null,
      requiresClinicianReview: true,
      context: {
        isCurrentSymptom: contextAnalysis.isHistorical ? false : true,
        isPatientSubject: contextAnalysis.isThirdParty ? false : true,
        classification: contextAnalysis.classification || 'ACTIVE_CONCERN',
        reason: contextAnalysis.reason || 'Symptom reported in conversational dialogue.',
      },
      detectedAt: new Date(),
    };
  }
}

export default RiskNormalizer;
