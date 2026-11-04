import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import logger from '../../utils/logger.js';

/**
 * Strict Zod Schema for Structured Report Narration
 */
export const narrationOutputSchema = z.object({
  overview: z.string().min(10, 'Overview must be at least 10 characters'),
  redFlags: z.array(
    z.object({
      description: z.string(),
      category: z.string(),
      flagId: z.string().optional(),
      severity: z.string().default('red'),
    })
  ).default([]),
  yellowFlags: z.array(
    z.object({
      description: z.string(),
      category: z.string(),
      flagId: z.string().optional(),
      severity: z.string().default('yellow'),
    })
  ).default([]),
  positiveProgress: z.array(z.string()).default([]),
  trendsSummary: z.string().default(''),
  patientConcerns: z.array(z.string()).default([]),
  clinicianFollowUp: z.array(z.string()).default([]),
  aiSuggestions: z.array(z.string()).default([]),
  dataCompletenessSummary: z.string().default(''),
  evidenceReferences: z.array(
    z.object({
      claimText: z.string(),
      section: z.string(),
      sourceType: z.enum(['OBSERVATION', 'FLAG', 'METRIC', 'PATIENT_PROFILE', 'CHECKIN']),
      sourceId: z.string(),
      confidence: z.number().min(0).max(1).default(1),
    })
  ).default([]),
});

/**
 * Report Narration Service
 * Governs Gemini generation and provides a 100% deterministic template fallback.
 */
export class ReportNarrationService {
  /**
   * Generates clinical narration for a report.
   *
   * @param {object} params
   * @param {object} params.patient - Patient document
   * @param {Date} params.periodStart - Start boundary
   * @param {Date} params.periodEnd - End boundary
   * @param {object} params.clinicalMetrics - Output of ClinicalAnalyticsEngine
   * @param {object} params.flagSummary - Output of ReportFlagIntegrator
   * @param {Array} params.explicitConcerns - Explicit patient concerns
   * @param {Array} params.patientQuestions - Explicit patient questions
   * @returns {Promise<object>} Parsed narration result with mode
   */
  static async generateNarration({
    patient,
    periodStart,
    periodEnd,
    clinicalMetrics,
    flagSummary,
    explicitConcerns = [],
    patientQuestions = [],
  }) {
    const { deterministicMetrics, trends, dataCompleteness } = clinicalMetrics;
    const { activeRedFlags = [], activeYellowFlags = [] } = flagSummary;

    // 1. Attempt Gemini Generation if API key is configured
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    const isMockOrTestKey = !apiKey || apiKey.includes('invalid') || apiKey.includes('your_') || apiKey.includes('sk-proj-invalid');

    if (!isMockOrTestKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const candidateModels = [process.env.GEMINI_MODEL || 'gemini-3.8-flash', 'gemini-2.5-flash'];
        let lastError = null;

        for (const modelName of candidateModels) {
          try {
            const model = genAI.getGenerativeModel(
              {
                model: modelName,
                generationConfig: { responseMimeType: 'application/json' },
              },
              { timeout: 12000 }
            );

            const prompt = `
You are a healthcare documentation assistant helping summarize patient check-in data for clinician review.

CRITICAL RULES:
1. DO NOT calculate numbers, percentages, or averages. Use ONLY the exact numbers provided below.
2. DO NOT invent symptoms, medications, or measurements.
3. DO NOT diagnose any disease or condition.
4. DO NOT prescribe or alter medications.
5. Missing data is NOT zero. Respect and mention data limitations.
6. Distinguish explicit patient concerns from AI suggestions.

PATIENT CONTEXT:
Name: ${patient.name}, Age: ${patient.age}
Reporting Period: ${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}

DETERMINISTIC CLINICAL METRICS (COMPUTED IN JS):
- Medication Adherence: ${deterministicMetrics.medicationAdherence?.adherencePct ?? 'N/A'}% (${deterministicMetrics.medicationAdherence?.knownDoses ?? 0} known doses, ${deterministicMetrics.medicationAdherence?.missedDoses ?? 0} missed, ${deterministicMetrics.medicationAdherence?.unknownDoses ?? 0} unknown, ${deterministicMetrics.medicationAdherence?.declinedDoses ?? 0} declined)
- Sleep: ${deterministicMetrics.sleepMetrics?.sleepAvg ?? 'N/A'} hours/night (trend: ${deterministicMetrics.sleepMetrics?.sleepTrend ?? 'N/A'}, valid observations: ${deterministicMetrics.sleepMetrics?.validCount ?? 0})
- Hydration: ${deterministicMetrics.hydrationMetrics?.hydrationAvg ?? 'N/A'} mL/day (trend: ${deterministicMetrics.hydrationMetrics?.hydrationTrend ?? 'N/A'}, valid observations: ${deterministicMetrics.hydrationMetrics?.validCount ?? 0})
- Physical Activity: ${deterministicMetrics.activityMetrics?.activityAvg ?? 'N/A'} minutes/day (trend: ${deterministicMetrics.activityMetrics?.activityTrend ?? 'N/A'})
- Symptoms Reported: ${JSON.stringify(deterministicMetrics.symptomMetrics?.symptomFrequency ?? {})}
- Weight Trend: ${JSON.stringify(deterministicMetrics.weightMetrics?.measurements ?? [])}

FLAGS:
- Active RED Flags (${activeRedFlags.length}): ${JSON.stringify(activeRedFlags.map(f => ({ id: f.flagId, category: f.category, description: f.description })))}
- Active YELLOW Flags (${activeYellowFlags.length}): ${JSON.stringify(activeYellowFlags.map(f => ({ id: f.flagId, category: f.category, description: f.description })))}

PATIENT CONCERNS:
- Explicit Questions: ${JSON.stringify(patientQuestions)}
- Explicit Stated Concerns: ${JSON.stringify(explicitConcerns.map(c => c.text))}

DATA COMPLETENESS:
- Completeness Ratio: ${dataCompleteness?.completenessRatio ?? 1} (${dataCompleteness?.overallStatus ?? 'COMPLETE'})
- Limitations: ${JSON.stringify(dataCompleteness?.limitations ?? [])}

Respond ONLY with valid JSON matching this schema:
{
  "overview": "Summary narrative framing patient status and primary findings",
  "redFlags": [{"description": "string", "category": "string", "flagId": "string", "severity": "red"}],
  "yellowFlags": [{"description": "string", "category": "string", "flagId": "string", "severity": "yellow"}],
  "positiveProgress": ["Bullet points of confirmed patient achievements"],
  "trendsSummary": "Summary of sleep, adherence, activity, and hydration trends",
  "patientConcerns": ["Exact concerns recorded by the patient"],
  "clinicianFollowUp": ["Recommended clinician review actions"],
  "aiSuggestions": ["Clearly labeled review suggestions"],
  "dataCompletenessSummary": "Disclosures of missing or unrecorded metrics"
}
`;

            const response = await model.generateContent(prompt);
            const content = response.response.text();
            const parsed = JSON.parse(content);

            const validation = narrationOutputSchema.safeParse(parsed);
            if (validation.success) {
              return {
                narration: validation.data,
                narrationMode: 'AI_GENERATED',
                modelUsed: modelName,
              };
            } else {
              lastError = validation.error.message;
              logger.warn(`[Report Narration] Zod schema validation failed for ${modelName}: ${lastError}`);
            }
          } catch (modelErr) {
            lastError = modelErr.message;
            logger.warn(`[Report Narration] Model ${modelName} error: ${lastError}`);
          }
        }
      } catch (err) {
        logger.warn(`[Report Narration] Gemini service error: ${err.message}. Proceeding to template fallback.`);
      }
    }

    // 2. Deterministic Template Fallback (Guarantees zero hard-failures)
    const fallbackNarration = this.generateDeterministicFallback({
      patient,
      periodStart,
      periodEnd,
      clinicalMetrics,
      flagSummary,
      explicitConcerns,
      patientQuestions,
    });

    return {
      narration: fallbackNarration,
      narrationMode: 'TEMPLATE_FALLBACK',
      modelUsed: 'deterministic_template_v1',
    };
  }

  /**
   * Pure deterministic fallback generator.
   */
  static generateDeterministicFallback({
    patient,
    periodStart,
    periodEnd,
    clinicalMetrics,
    flagSummary,
    explicitConcerns = [],
    patientQuestions = [],
  }) {
    const { deterministicMetrics, dataCompleteness } = clinicalMetrics;
    const { activeRedFlags = [], activeYellowFlags = [] } = flagSummary;

    const startDateStr = new Date(periodStart).toLocaleDateString();
    const endDateStr = new Date(periodEnd).toLocaleDateString();

    const adherence = deterministicMetrics.medicationAdherence?.adherencePct !== null
      ? `${deterministicMetrics.medicationAdherence.adherencePct}%`
      : 'Insufficient data';

    // 1. Overview
    const redAlert = activeRedFlags.length > 0
      ? ` ⚠️ ${activeRedFlags.length} active RED FLAG(S) require urgent clinician review.`
      : ' No active red flags detected.';
    const overview = `${patient.name} completed check-in surveillance between ${startDateStr} and ${endDateStr}. Overall medication adherence was ${adherence}.${redAlert}`;

    // 2. Positive Progress
    const positiveProgress = [];
    if (typeof deterministicMetrics?.activityMetrics?.activityAvg === 'number') {
      positiveProgress.push(
        `Maintained average physical activity of ${deterministicMetrics.activityMetrics.activityAvg} minutes/day (${deterministicMetrics.activityMetrics.activityTrend || 'stable'} trend).`
      );
    }
    if (typeof deterministicMetrics?.sleepMetrics?.sleepAvg === 'number') {
      positiveProgress.push(
        `Recorded average sleep of ${deterministicMetrics.sleepMetrics.sleepAvg} hours/night (${deterministicMetrics.sleepMetrics.sleepTrend || 'stable'} trend).`
      );
    }
    if (typeof deterministicMetrics?.hydrationMetrics?.hydrationAvg === 'number') {
      positiveProgress.push(
        `Hydration intake averaged ${deterministicMetrics.hydrationMetrics.hydrationAvg} mL/day (${deterministicMetrics.hydrationMetrics.hydrationTrend || 'stable'} trend).`
      );
    }
    if (positiveProgress.length === 0) {
      positiveProgress.push('Patient engaged in voice check-in communications during this reporting window.');
    }

    // 3. Trends Summary
    const trendsSummary = `Adherence: ${adherence}. Sleep average: ${
      deterministicMetrics.sleepMetrics?.sleepAvg ?? 'N/A'
    } hrs. Activity average: ${
      deterministicMetrics.activityMetrics?.activityAvg ?? 'N/A'
    } mins. Hydration: ${
      deterministicMetrics.hydrationMetrics?.hydrationAvg ?? 'N/A'
    } mL.`;

    // 4. Flags
    const redFlagRefs = activeRedFlags.map((f) => ({
      description: f.description,
      category: f.category,
      flagId: f.flagId?.toString(),
      severity: 'red',
    }));

    const yellowFlagRefs = activeYellowFlags.map((f) => ({
      description: f.description,
      category: f.category,
      flagId: f.flagId?.toString(),
      severity: 'yellow',
    }));

    // 5. Patient Concerns & Questions
    const concerns = explicitConcerns.map((c) => c.text);

    // 6. Clinician Follow-up Tasks
    const clinicianFollowUp = [];
    if (activeRedFlags.length > 0) {
      clinicianFollowUp.push(`Urgent clinical contact required regarding ${activeRedFlags[0].category.replace('_', ' ')}.`);
    }
    if (
      deterministicMetrics.medicationAdherence?.adherencePct !== null &&
      deterministicMetrics.medicationAdherence.adherencePct < 90
    ) {
      clinicianFollowUp.push('Review medication schedule and evaluate potential adverse reactions or barriers.');
    }
    if (activeYellowFlags.length > 0) {
      clinicianFollowUp.push(`Evaluate moderate concerns regarding ${activeYellowFlags[0].category.replace('_', ' ')}.`);
    }

    // 7. AI Suggestions (explicitly labeled)
    const aiSuggestions = [
      'Suggestion: Review hydration targets if fluid-restricted heart failure protocol applies.',
      'Suggestion: Confirm emergency contact readiness during next clinical check-in.',
    ];

    // 8. Data Completeness Summary
    const dataCompletenessSummary = dataCompleteness?.limitations?.length > 0
      ? `Data completeness ratio: ${dataCompleteness.completenessRatio * 100}%. Limitations: ${dataCompleteness.limitations.join(' ')}`
      : 'All primary daily health metric domains were fully recorded.';

    return {
      overview,
      redFlags: redFlagRefs,
      yellowFlags: yellowFlagRefs,
      positiveProgress,
      trendsSummary,
      patientConcerns: concerns,
      clinicianFollowUp,
      aiSuggestions,
      dataCompletenessSummary,
      evidenceReferences: [],
    };
  }
}

export default ReportNarrationService;
