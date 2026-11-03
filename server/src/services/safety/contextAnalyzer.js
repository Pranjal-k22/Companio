/**
 * Clinical Statement Context Analyzer
 * 
 * Performs deterministic clause-level semantic segmentation and context analysis:
 * - Clause isolation (prevents negation in one clause from suppressing emergencies in another)
 * - Negation detection ("did not have", "no chest pain")
 * - Temporal context (historical vs acute/current)
 * - Subject attribution (patient self vs third-party/family member)
 * - Hypothetical inquiry detection ("what happens if someone experiences...")
 * - Transcript correction detection ("The transcription is wrong. I said I have no pain.")
 */

// Contraction expansion dictionary for robust phrase alignment
const CONTRACTIONS = {
  "can't": "cannot",
  "won't": "will not",
  "n't": " not",
  "'m": " am",
  "'re": " are",
  "'ve": " have",
  "'ll": " will",
  "'d": " would",
};

// Negation cue phrases
export const NEGATION_CUES = [
  'did not',
  'do not',
  'does not',
  'have not',
  'has not',
  'had not',
  'cannot',
  'is not',
  'was not',
  'no',
  'not',
  'never',
  'none',
  'without',
  'denies',
  'deny',
  'denied',
  'free of',
  'ruled out',
  'negative for',
  'hardly any',
  'barely any',
  'zero',
];

// Historical temporal cues
export const HISTORICAL_CUES = [
  'last year',
  'years ago',
  'when i was young',
  'when i was a kid',
  'in the past',
  'previously',
  'used to have',
  'used to get',
  'used to be',
  'months ago',
  'last month',
  'weeks ago',
  'history of',
  'back in',
  'resolved',
  'in 2020',
  'in 2021',
  'in 2022',
  'in 2023',
  'in 2024',
  'in 2025',
];

// Acute / Current temporal cues (overrides historical if both mentioned)
export const ACUTE_CUES = [
  'right now',
  'currently',
  'today',
  'this morning',
  'just now',
  'just started',
  'an hour ago',
  'minutes ago',
  'few minutes ago',
  'suddenly',
  'presently',
  'still hurting',
  'worsening right now',
];

// Third-party subject attribution cues
export const THIRD_PARTY_CUES = [
  'my husband',
  'my wife',
  'my spouse',
  'my mother',
  'my father',
  'my mom',
  'my dad',
  'my son',
  'my daughter',
  'my sister',
  'my brother',
  'my friend',
  'my neighbor',
  'someone else',
  'somebody',
  'a friend of mine',
  'he has',
  'she has',
  'they have',
  'his chest',
  'her chest',
  'their chest',
];

// Hypothetical / General inquiry cues
export const HYPOTHETICAL_CUES = [
  'what happens if',
  'what should someone do if',
  'if someone has',
  'if someone experiences',
  'if a person gets',
  'can someone',
  'hypothetically',
  'just wondering if',
  'curious if',
  'is it possible for someone',
];

// Transcript correction cues
export const CORRECTION_CUES = [
  'transcription is wrong',
  'transcription made a mistake',
  'speech recognition made a mistake',
  'voice recognition got it wrong',
  'mistranscribed',
  'i said i do not',
  'i said i have no',
  'that is not what i said',
  'did not say that',
];

/**
 * Normalizes text: expands contractions, trims whitespace, retains basic clause markers
 */
export function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  let normalized = text.toLowerCase();

  for (const [contraction, expansion] of Object.entries(CONTRACTIONS)) {
    normalized = normalized.replaceAll(contraction, expansion);
  }

  return normalized.trim();
}

/**
 * Segments a statement into discrete clauses based on punctuation and adversative conjunctions.
 * Example: "I had no headache, but I have chest pain right now" ->
 *   Clause 1: "I had no headache"
 *   Clause 2: "I have chest pain right now"
 */
export function segmentIntoClauses(text) {
  if (!text) return [];
  const normalized = normalizeText(text);

  // Split on punctuation (. ; ! ? ,) and coordinating/adversative conjunctions (but, however, although, yet, except)
  const rawSegments = normalized.split(/(?:[.!?;]|\b(?:but|however|although|yet|except|whereas)\b)+/);

  return rawSegments
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Analyzes a single clause or entire statement for clinical context
 * 
 * @param {string} clauseText - The clause containing the matched symptom phrase
 * @param {string} matchedPhrase - The keyword/phrase that matched (e.g., 'chest pain')
 * @returns {object} Context evaluation results
 */
export function analyzeClauseContext(clauseText, matchedPhrase) {
  const normClause = normalizeText(clauseText);
  const phrase = matchedPhrase.toLowerCase();

  // 1. Check for Transcript Correction
  for (const cue of CORRECTION_CUES) {
    if (normClause.includes(cue)) {
      return {
        isCorrection: true,
        isNegated: false,
        isHistorical: false,
        isThirdParty: false,
        isHypothetical: false,
        isActiveConcern: false,
        classification: 'TRANSCRIPT_CORRECTION',
        reason: `Matched transcript correction cue: "${cue}"`,
      };
    }
  }

  // 2. Check for Hypothetical Inquiry
  for (const cue of HYPOTHETICAL_CUES) {
    if (normClause.includes(cue)) {
      return {
        isCorrection: false,
        isNegated: false,
        isHistorical: false,
        isThirdParty: false,
        isHypothetical: true,
        isActiveConcern: false,
        classification: 'HYPOTHETICAL_INQUIRY',
        reason: `Matched hypothetical inquiry cue: "${cue}"`,
      };
    }
  }

  // 3. Check for Third-Party Attribution
  for (const cue of THIRD_PARTY_CUES) {
    if (normClause.includes(cue)) {
      return {
        isCorrection: false,
        isNegated: false,
        isHistorical: false,
        isThirdParty: true,
        isHypothetical: false,
        isActiveConcern: false,
        classification: 'THIRD_PARTY_ATTRIBUTION',
        reason: `Matched third-party attribution cue: "${cue}"`,
      };
    }
  }

  // 4. Check for Negation
  // Checks if a negation cue precedes or directly qualifies the matched phrase within the clause
  let isNegated = false;
  let matchedNegationCue = null;

  for (const cue of NEGATION_CUES) {
    // Regex pattern looking for negation cue within 6 words before the matched phrase
    // e.g. "did not have any severe chest pain"
    const escapedCue = cue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const negationRegex = new RegExp(`\\b${escapedCue}\\b(?:\\s+\\w+){0,6}\\s+${escapedPhrase}`, 'i');

    if (negationRegex.test(normClause)) {
      isNegated = true;
      matchedNegationCue = cue;
      break;
    }
  }

  if (isNegated) {
    return {
      isCorrection: false,
      isNegated: true,
      isHistorical: false,
      isThirdParty: false,
      isHypothetical: false,
      isActiveConcern: false,
      classification: 'NEGATED',
      reason: `Matched negation cue "${matchedNegationCue}" qualifying "${matchedPhrase}"`,
    };
  }

  // 5. Check Temporal Context (Historical vs Acute)
  let isHistorical = false;
  let matchedHistoricalCue = null;
  let isAcute = false;

  for (const cue of ACUTE_CUES) {
    if (normClause.includes(cue)) {
      isAcute = true;
      break;
    }
  }

  if (!isAcute) {
    for (const cue of HISTORICAL_CUES) {
      if (normClause.includes(cue)) {
        isHistorical = true;
        matchedHistoricalCue = cue;
        break;
      }
    }
  }

  if (isHistorical) {
    return {
      isCorrection: false,
      isNegated: false,
      isHistorical: true,
      isThirdParty: false,
      isHypothetical: false,
      isActiveConcern: false,
      classification: 'HISTORICAL',
      reason: `Matched historical cue "${matchedHistoricalCue}"`,
    };
  }

  // 6. Confirmed Active Clinical Concern
  return {
    isCorrection: false,
    isNegated: false,
    isHistorical: false,
    isThirdParty: false,
    isHypothetical: false,
    isActiveConcern: true,
    classification: 'ACTIVE_CONCERN',
    reason: `First-person active concern detected: "${matchedPhrase}"`,
  };
}

export const analyzeClinicalContext = analyzeClauseContext;
export const isNegated = (clause, phrase = '') => analyzeClauseContext(clause, phrase).isNegated;
export const isHistorical = (clause, phrase = '') => analyzeClauseContext(clause, phrase).isHistorical;
export const isThirdParty = (clause, phrase = '') => analyzeClauseContext(clause, phrase).isThirdParty;
export const isHypothetical = (clause, phrase = '') => analyzeClauseContext(clause, phrase).isHypothetical;
export const hasCorrection = (clause, phrase = '') => analyzeClauseContext(clause, phrase).isCorrection;

export default {
  normalizeText,
  segmentIntoClauses,
  analyzeClauseContext,
  analyzeClinicalContext,
  isNegated,
  isHistorical,
  isThirdParty,
  isHypothetical,
  hasCorrection,
};
