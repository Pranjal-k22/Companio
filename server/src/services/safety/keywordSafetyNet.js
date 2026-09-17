import { Flag } from '../../models/index.js';
import notifyClinicianForRedFlag from '../escalation/notifyClinician.js';

/**
 * High-Stakes RED Flag Keyword & Pattern Rules Specification
 * Case-insensitive phrase matchers tolerant of minor speech variations.
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
 * Evaluates transcript text against deterministic RED flag keyword patterns.
 * 
 * @param {string} transcriptText - Recognized transcript text
 * @returns {Array<{ category: string, matchedPhrase: string }>} Array of detected red flag matches
 */
export function checkTranscriptForRedFlags(transcriptText) {
  if (!transcriptText || typeof transcriptText !== 'string') return [];

  const textLower = transcriptText.toLowerCase();
  const matches = [];

  for (const pattern of RED_FLAG_KEYWORD_PATTERNS) {
    for (const phrase of pattern.phrases) {
      if (textLower.includes(phrase)) {
        matches.push({
          category: pattern.category,
          matchedPhrase: phrase,
        });
        break; // Match once per category
      }
    }
  }

  return matches;
}

/**
 * Runs the deterministic safety net check in parallel with LLM processing.
 * Deduplicates against existing flags logged for the same conversation and category.
 * 
 * @param {string} transcriptText - Final transcript string
 * @param {object} sessionContext - Session context containing patientId and conversationId
 * @returns {Promise<Array<object>>} Created safety net Flag documents
 */
export async function runSafetyNetCheck(transcriptText, sessionContext) {
  const { patientId, conversationId } = sessionContext;
  const matches = checkTranscriptForRedFlags(transcriptText);

  if (matches.length === 0) return [];

  const createdFlags = [];

  for (const match of matches) {
    // Atomic Deduplication: check if a flag for this (conversationId, category) already exists
    const existingFlag = await Flag.findOne({ conversationId, category: match.category });
    if (existingFlag) {
      console.log(`[Safety Net Deduplicated] Flag for '${match.category}' already logged by LLM for Conversation ${conversationId}.`);
      continue;
    }

    console.warn(
      `🚨 [SAFETY NET INTERVENTION] Deterministic safety net caught RED flag '${match.category}' (Matched phrase: "${match.matchedPhrase}") for Conversation ${conversationId}!`
    );

    try {
      // Use atomic upsert to guarantee no duplicate flag is created if LLM tool call executes simultaneously
      const flag = await Flag.findOneAndUpdate(
        { conversationId, category: match.category },
        {
          $setOnInsert: {
            patientId,
            conversationId,
            severity: 'red',
            category: match.category,
            description: `[Safety Net Emergency Match] Recognized red flag phrase: "${match.matchedPhrase}" in transcript.`,
            sourceText: transcriptText,
            ruleId: `SAFETY_NET_KW_${match.category.toUpperCase()}`,
            source: 'keyword_safety_net',
            status: 'escalated',
            escalatedAt: new Date(),
          },
        },
        { upsert: true, new: true, rawResult: true }
      );

      const targetDoc = flag.value || flag;
      // If updatedExisting is true, LLM inserted it right at the same moment -> deduplicated
      if (flag.lastErrorObject?.updatedExisting) {
        console.log(`[Safety Net Atomic Deduplicated] Flag for '${match.category}' was concurrently logged by LLM.`);
      } else if (targetDoc && targetDoc._id) {
        createdFlags.push(targetDoc);
        if (targetDoc.severity === 'red' || targetDoc.severity === 'RED') {
          try {
            await notifyClinicianForRedFlag(targetDoc);
          } catch (e) {
            console.warn('[Safety Net Escalation Warning]:', e.message);
          }
        }
      }
    } catch (err) {
      console.error('[Safety Net Error] Flag upsert failed:', err.message);
    }
  }

  return createdFlags;
}

export default checkTranscriptForRedFlags;
