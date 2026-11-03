import { Flag } from '../../models/index.js';
import notifyClinicianForRedFlag from '../escalation/notifyClinician.js';
import { safetyRuleEngine } from './safetyRuleEngine.js';
import { segmentIntoClauses, analyzeClauseContext, normalizeText } from './contextAnalyzer.js';
import { RiskNormalizer } from './riskNormalizer.js';
import { FlagDeduplicator } from './flagDeduplicator.js';

/**
 * Backward-compatible export of RED flag patterns
 */
export const RED_FLAG_KEYWORD_PATTERNS = [
  {
    category: 'chest_pain',
    phrases: ['chest pain', 'chest hurts', 'chest tightness', 'pressure in my chest', 'tightness in my chest', 'heavy chest'],
  },
  {
    category: 'severe_breathlessness',
    phrases: ["can't breathe", "cannot breathe", "can't catch my breath", "trouble breathing", "gasping for air", "shortness of breath"],
  },
  {
    category: 'stroke_signs',
    phrases: ["can't feel my", "face feels numb", "can't talk right", "one side is weak", "slurred speech"],
  },
  {
    category: 'self_harm_ideation',
    phrases: ["want to hurt myself", "don't want to be here", "end it all", "no reason to live"],
  },
  {
    category: 'severe_dizziness_fainting',
    phrases: ["passed out", "blacked out", "everything went dark", "fainted"],
  },
  {
    category: 'fall_with_injury',
    phrases: ["fell and can't get up", "fell and i'm hurt", "fell and hurt my"],
  },
  {
    category: 'uncontrolled_bleeding',
    phrases: ["won't stop bleeding", "bleeding a lot", "gushing blood"],
  },
];

/**
 * Evaluates transcript text against deterministic safety rules with context & negation filtering.
 * 
 * @param {string} transcriptText - Recognized transcript text
 * @param {object} [options] - Options including organizationId and enableContextAnalysis
 * @returns {Array<{ category: string, matchedPhrase: string, severity: string, context: object }>}
 */
export function checkTranscriptForRedFlags(transcriptText, options = {}) {
  if (!transcriptText || typeof transcriptText !== 'string') return [];

  const { organizationId = null, enableContextAnalysis = true } = options;
  const rawMatches = safetyRuleEngine.evaluateText(transcriptText, organizationId);
  if (rawMatches.length === 0) return [];

  const clauses = segmentIntoClauses(transcriptText);
  const evaluatedDetections = [];
  const seenCategories = new Set();

  for (const match of rawMatches) {
    if (seenCategories.has(match.category)) continue;

    const pattern = match.matchedPattern.toLowerCase();

    // Find the specific clause containing this pattern
    let relevantClause = transcriptText;
    for (const c of clauses) {
      if (c.toLowerCase().includes(pattern)) {
        relevantClause = c;
        break;
      }
    }

    let context = { isActiveConcern: true, classification: 'ACTIVE_CONCERN' };
    if (enableContextAnalysis) {
      context = analyzeClauseContext(relevantClause, pattern);
    }

    if (context.isActiveConcern) {
      seenCategories.add(match.category);
      evaluatedDetections.push({
        category: match.category,
        matchedPhrase: match.matchedPattern,
        severity: match.severity,
        ruleId: match.ruleId,
        ruleVersion: match.ruleVersion,
        context,
        clause: relevantClause,
      });
    }
  }

  return evaluatedDetections;
}

/**
 * Evaluates full contextual profile of a statement (including non-active/negated/historical mentions)
 */
export function analyzeTranscriptSafetyProfile(transcriptText, options = {}) {
  if (!transcriptText || typeof transcriptText !== 'string') return [];

  const { organizationId = null } = options;
  const rawMatches = safetyRuleEngine.evaluateText(transcriptText, organizationId);
  const clauses = segmentIntoClauses(transcriptText);
  const profile = [];

  for (const match of rawMatches) {
    const pattern = match.matchedPattern.toLowerCase();
    let relevantClause = transcriptText;
    for (const c of clauses) {
      if (c.toLowerCase().includes(pattern)) {
        relevantClause = c;
        break;
      }
    }

    const context = analyzeClauseContext(relevantClause, pattern);
    profile.push({
      category: match.category,
      severity: match.severity,
      ruleId: match.ruleId,
      matchedPhrase: match.matchedPattern,
      clause: relevantClause,
      context,
    });
  }

  return profile;
}

/**
 * Runs the deterministic safety net check in parallel with LLM processing.
 * Normalizes signals and atomically deduplicates against existing flags.
 * 
 * @param {string} transcriptText - Final transcript string
 * @param {object} sessionContext - Session context containing patientId, organizationId, conversationId, turnId
 * @returns {Promise<Array<object>>} Created or merged safety net Flag documents
 */
export async function runSafetyNetCheck(transcriptText, sessionContext = {}) {
  const { patientId, conversationId, organizationId } = sessionContext;
  const activeDetections = checkTranscriptForRedFlags(transcriptText, { organizationId });

  if (activeDetections.length === 0) return [];

  const createdFlags = [];

  for (const detection of activeDetections) {
    console.warn(
      `🚨 [SAFETY NET INTERVENTION] Deterministic safety net caught ${detection.severity.toUpperCase()} flag '${detection.category}' (Matched phrase: "${detection.matchedPhrase}") for Conversation ${conversationId}!`
    );

    try {
      const normalizedSignal = RiskNormalizer.normalizeSignal({
        source: 'keyword_safety_net',
        category: detection.category,
        severity: detection.severity,
        evidenceText: `[Safety Net Emergency Match] Recognized phrase: "${detection.matchedPhrase}" in: "${detection.clause}".`,
        matchedPattern: detection.matchedPhrase,
        ruleId: detection.ruleId,
        ruleVersion: detection.ruleVersion,
        sessionContext,
        contextAnalysis: detection.context,
      });

      const { flag, isNew, isMerged } = await FlagDeduplicator.deduplicateAndPersist(normalizedSignal);

      if (flag) {
        createdFlags.push(flag);

        // If newly created RED flag (not already escalated), trigger notification
        if (isNew && flag.severity === 'red') {
          try {
            await notifyClinicianForRedFlag(flag);
          } catch (e) {
            console.warn('[Safety Net Escalation Warning]:', e.message);
          }
        }
      }
    } catch (err) {
      console.error('[Safety Net Error] Flag processing failed:', err.message);
    }
  }

  return createdFlags;
}

export const keywordSafetyNet = {
  checkTranscriptForRedFlags,
  runSafetyNetCheck,
  evaluateUtterance: (text, options = {}) => {
    const concerns = checkTranscriptForRedFlags(text, options);
    return {
      hasConcerns: concerns.length > 0,
      concerns,
    };
  },
};

export default checkTranscriptForRedFlags;
