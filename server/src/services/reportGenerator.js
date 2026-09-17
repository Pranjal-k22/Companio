import { GoogleGenerativeAI } from '@google/generative-ai';
import { Checkin, Flag, Report, Patient } from '../models/index.js';

/**
 * Computes ground-truth clinical trends using plain JS statistics.
 * The LLM MUST NOT calculate these numbers.
 *
 * @param {string} patientId - Mongoose ObjectId string
 * @param {Date} startDate - Period start
 * @param {Date} endDate - Period end
 * @returns {Promise<object>} Ground-truth trends object
 */
export async function computeClinicalTrends(patientId, startDate, endDate) {
  const query = {
    patientId,
    timestamp: { $gte: startDate, $lte: endDate },
  };

  const checkins = await Checkin.find(query).sort({ timestamp: 1 });
  const flags = await Flag.find({
    patientId,
    createdAt: { $gte: startDate, $lte: endDate },
  }).sort({ createdAt: -1 });

  const patient = await Patient.findById(patientId);

  const redFlags = flags.filter((f) => f.severity === 'red');
  const yellowFlags = flags.filter((f) => f.severity === 'yellow');

  // Count red/yellow flags by category
  const redFlagsByCategory = {};
  redFlags.forEach((f) => {
    redFlagsByCategory[f.category] = (redFlagsByCategory[f.category] || 0) + 1;
  });

  const yellowFlagsByCategory = {};
  yellowFlags.forEach((f) => {
    yellowFlagsByCategory[f.category] = (yellowFlagsByCategory[f.category] || 0) + 1;
  });

  if (checkins.length === 0) {
    return {
      totalCheckins: 0,
      adherencePct: 100,
      missedDoses: 0,
      sleepAvg: patient?.baselineMetrics?.sleepHoursTarget || 7.5,
      sleepTrend: 'stable',
      hydrationAvg: patient?.baselineMetrics?.hydrationGoalMl || 2000,
      hydrationTrend: 'stable',
      activityAvg: patient?.baselineMetrics?.activityGoal || 30,
      activityTrend: 'stable',
      symptomFrequency: {},
      flagCounts: { red: redFlagsByCategory, yellow: yellowFlagsByCategory },
      redFlags,
      yellowFlags,
      weightTrend: patient?.baselineMetrics?.weight ? [{ date: 'Baseline', value: patient.baselineMetrics.weight }] : [],
      patientConcerns: [],
      checkinSummaries: [],
    };
  }

  // Calculate Adherence %
  let totalDosesExpected = 0;
  let totalDosesTaken = 0;
  let missedDosesCount = 0;

  let totalSleep = 0;
  let totalHydration = 0;
  let totalActivity = 0;
  const symptomCounts = {};
  const concernsSet = new Set();
  const checkinSummaries = [];
  const weightTrend = [];

  checkins.forEach((c) => {
    // Adherence
    if (c.adherence) {
      const missed = c.adherence.missedDoses || 0;
      missedDosesCount += missed;
      const taken = c.adherence.taken ? 1 : 0;
      totalDosesTaken += taken;
      totalDosesExpected += taken + missed;
    }

    // Sleep
    if (c.sleep?.hours) {
      totalSleep += c.sleep.hours;
    }

    // Hydration
    if (c.hydration?.estimatedMl) {
      totalHydration += c.hydration.estimatedMl;
    } else if (c.hydration?.glasses) {
      totalHydration += c.hydration.glasses * 250;
    }

    // Activity
    if (c.activity?.minutesActive) {
      totalActivity += c.activity.minutesActive;
    }

    // Symptoms frequency
    if (c.symptoms && Array.isArray(c.symptoms)) {
      c.symptoms.forEach((s) => {
        if (s.name) {
          symptomCounts[s.name] = (symptomCounts[s.name] || 0) + 1;
        }
      });
    }

    // Patient concerns / recordConcern entries
    if (c.patientConcerns && Array.isArray(c.patientConcerns)) {
      c.patientConcerns.forEach((concern) => {
        if (concern && typeof concern === 'string') concernsSet.add(concern);
      });
    }

    // Checkin notes / summary
    if (c.adherence?.notes) {
      checkinSummaries.push(c.adherence.notes);
    }
    if (c.symptoms?.length > 0) {
      c.symptoms.forEach((s) => checkinSummaries.push(`Symptom: ${s.name} (${s.severity || 'reported'})`));
    }

    // Weight tracking if present in checkin notes or metrics
    if (c.weight) {
      weightTrend.push({ date: new Date(c.timestamp).toLocaleDateString(), value: c.weight });
    }
  });

  // If no checkin weight recorded, include baseline weight as fallback reference
  if (weightTrend.length === 0 && patient?.baselineMetrics?.weight) {
    weightTrend.push({ date: 'Baseline', value: patient.baselineMetrics.weight });
  }

  const count = checkins.length;
  const adherencePct = totalDosesExpected > 0 ? Math.round((totalDosesTaken / totalDosesExpected) * 100) : 100;
  const sleepAvg = parseFloat((totalSleep / count).toFixed(1));
  const hydrationAvg = Math.round(totalHydration / count);
  const activityAvg = Math.round(totalActivity / count);

  // Compute trend directions vs first half of period
  const half = Math.floor(count / 2);
  let sleepTrend = 'stable';
  let activityTrend = 'stable';
  let hydrationTrend = 'stable';

  if (half > 0) {
    // Sleep trend
    const firstHalfSleep = checkins.slice(0, half).reduce((sum, c) => sum + (c.sleep?.hours || 0), 0) / half;
    const secondHalfSleep = checkins.slice(half).reduce((sum, c) => sum + (c.sleep?.hours || 0), 0) / (count - half);
    if (secondHalfSleep - firstHalfSleep >= 0.5) sleepTrend = 'improving';
    else if (firstHalfSleep - secondHalfSleep >= 0.5) sleepTrend = 'declining';

    // Activity trend
    const firstHalfAct = checkins.slice(0, half).reduce((sum, c) => sum + (c.activity?.minutesActive || 0), 0) / half;
    const secondHalfAct = checkins.slice(half).reduce((sum, c) => sum + (c.activity?.minutesActive || 0), 0) / (count - half);
    if (secondHalfAct - firstHalfAct >= 5) activityTrend = 'improving';
    else if (firstHalfAct - secondHalfAct >= 5) activityTrend = 'declining';

    // Hydration trend
    const firstHalfHyd = checkins.slice(0, half).reduce((sum, c) => sum + (c.hydration?.estimatedMl || 0), 0) / half;
    const secondHalfHyd = checkins.slice(half).reduce((sum, c) => sum + (c.hydration?.estimatedMl || 0), 0) / (count - half);
    if (secondHalfHyd - firstHalfHyd >= 200) hydrationTrend = 'improving';
    else if (firstHalfHyd - secondHalfHyd >= 200) hydrationTrend = 'declining';
  }

  return {
    totalCheckins: count,
    adherencePct,
    missedDoses: missedDosesCount,
    sleepAvg,
    sleepTrend,
    hydrationAvg,
    hydrationTrend,
    activityAvg,
    activityTrend,
    symptomFrequency: symptomCounts,
    flagCounts: { red: redFlagsByCategory, yellow: yellowFlagsByCategory },
    redFlags,
    yellowFlags,
    weightTrend,
    patientConcerns: Array.from(concernsSet),
    checkinSummaries: checkinSummaries.slice(0, 15), // cap summary lines
  };
}

/**
 * Generate a template-based fallback report if LLM API is unconfigured, invalid, or fails.
 */
export function generateTemplateFallbackReport(patient, computedTrends, periodStart, periodEnd) {
  const redFlagRefs = computedTrends.redFlags.map((f) => ({
    description: f.description,
    category: f.category,
    flagId: f._id,
  }));

  const yellowFlagRefs = computedTrends.yellowFlags.map((f) => ({
    description: f.description,
    category: f.category,
    flagId: f._id,
  }));

  const overview = `${patient.name} completed ${computedTrends.totalCheckins} voice check-ins between ${periodStart.toLocaleDateString()} and ${periodEnd.toLocaleDateString()}. Overall medication adherence is ${computedTrends.adherencePct}%. ${
    computedTrends.redFlags.length > 0 ? `⚠️ ${computedTrends.redFlags.length} RED FLAG(S) detected requiring clinician review.` : 'No red flags detected.'
  }`;

  const positiveProgress = [
    `Maintained average daily physical activity of ${computedTrends.activityAvg} minutes (${computedTrends.activityTrend} trend).`,
    `Hydration intake averaged ${computedTrends.hydrationAvg} mL/day (${computedTrends.hydrationTrend} trend).`,
    `Average sleep recorded at ${computedTrends.sleepAvg} hours/night (${computedTrends.sleepTrend} trend).`,
  ];

  const followUp = [];
  if (computedTrends.redFlags.length > 0) {
    followUp.push(`Urgent follow-up required regarding ${computedTrends.redFlags[0].category.replace('_', ' ')}.`);
  }
  if (computedTrends.adherencePct < 90) {
    followUp.push('Review medication adherence schedule and potential side effects.');
  }

  return {
    patientId: patient._id,
    periodStart,
    periodEnd,
    overview,
    redFlags: redFlagRefs,
    yellowFlags: yellowFlagRefs,
    positiveProgress,
    trends: {
      weight: computedTrends.weightTrend,
      adherencePct: computedTrends.adherencePct,
      sleepAvg: computedTrends.sleepAvg,
      activityAvg: computedTrends.activityAvg,
      hydrationAvg: computedTrends.hydrationAvg,
    },
    patientConcerns: computedTrends.patientConcerns,
    followUp,
    generatedAt: new Date(),
  };
}

/**
 * Validates parsed LLM JSON against Report schema requirements.
 * Returns null if valid, or an error string if invalid.
 */
function validateReportJson(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return 'Output is not a valid JSON object.';
  }
  if (!parsed.overview || typeof parsed.overview !== 'string') {
    return 'Missing or invalid "overview" string field.';
  }
  if (!Array.isArray(parsed.positiveProgress)) {
    return 'Missing or invalid "positiveProgress" array field.';
  }
  if (parsed.redFlags && !Array.isArray(parsed.redFlags)) {
    return '"redFlags" must be an array.';
  }
  if (parsed.yellowFlags && !Array.isArray(parsed.yellowFlags)) {
    return '"yellowFlags" must be an array.';
  }
  return null;
}

/**
 * Main Report Generator Service function using Google Gemini 2.0 Flash
 *
 * @param {string} patientId - Target patient ObjectId string
 * @param {Date} periodStart - Period start date
 * @param {Date} periodEnd - Period end date
 * @returns {Promise<object>} Created Mongoose Report document
 */
export async function generateClinicianReport(patientId, periodStart, periodEnd) {
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new Error('Patient record not found.');
  }

  // 1. Compute ground-truth clinical numbers in plain JS
  const computedTrends = await computeClinicalTrends(patientId, periodStart, periodEnd);

  // 2. Try LLM narration if GEMINI_API_KEY or OPENAI_API_KEY is configured
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (apiKey && !apiKey.includes('your_')) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });
    let retryAttempt = 0;
    let lastError = null;

    while (retryAttempt < 2) {
      try {
        const promptSystem = `
You are a clinical documentation assistant generating a structured report for clinician review.

CRITICAL REQUIREMENT: Do not calculate percentages or averages yourself. Use ONLY the provided computed ground-truth trends object. Your sole job is narration and clinical framing of the numbers.

PATIENT INFORMATION:
Name: ${patient.name}, Age: ${patient.age}

COMPUTED GROUND-TRUTH TRENDS (DO NOT RE-CALCULATE):
- Total Check-ins: ${computedTrends.totalCheckins}
- Medication Adherence: ${computedTrends.adherencePct}% (${computedTrends.missedDoses} missed doses)
- Sleep Average: ${computedTrends.sleepAvg} hours (${computedTrends.sleepTrend} trend)
- Hydration Average: ${computedTrends.hydrationAvg} mL/day (${computedTrends.hydrationTrend} trend)
- Activity Average: ${computedTrends.activityAvg} minutes/day (${computedTrends.activityTrend} trend)
- Symptom Frequencies: ${JSON.stringify(computedTrends.symptomFrequency)}
- Flag Counts by Category: ${JSON.stringify(computedTrends.flagCounts)}
- RED Flags (${computedTrends.redFlags.length}): ${JSON.stringify(computedTrends.redFlags.map(f => ({ id: f._id, category: f.category, description: f.description })))}
- YELLOW Flags (${computedTrends.yellowFlags.length}): ${JSON.stringify(computedTrends.yellowFlags.map(f => ({ id: f._id, category: f.category, description: f.description })))}
- Patient Explicit Concerns: ${JSON.stringify(computedTrends.patientConcerns)}
- Checkin Summaries: ${JSON.stringify(computedTrends.checkinSummaries)}

Respond ONLY with valid JSON matching this exact schema:
{
  "overview": "Clinical summary of patient status narrative wrapping the numbers",
  "redFlags": [{ "description": "string", "category": "string", "flagId": "ObjectId string" }],
  "yellowFlags": [{ "description": "string", "category": "string", "flagId": "ObjectId string" }],
  "positiveProgress": ["bullet point strings"],
  "patientConcerns": ["bullet point strings"],
  "followUp": ["recommended clinician follow-up actions"]
}
${lastError ? `\n\nERROR IN PREVIOUS ATTEMPT: ${lastError}. Please correct the JSON output format and schema.` : ''}
`;

        const result = await model.generateContent(promptSystem);
        const response = await result.response;
        const content = response.text();
        const parsed = JSON.parse(content);

        // Validate JSON schema
        const validationError = validateReportJson(parsed);
        if (validationError) {
          lastError = validationError;
          retryAttempt++;
          console.warn(`[Report Generator] LLM JSON validation failed (Attempt ${retryAttempt}/2): ${validationError}`);
          continue;
        }

        // Schema validation passed -> construct report document
        const reportData = {
          patientId,
          periodStart,
          periodEnd,
          overview: parsed.overview,
          redFlags: (parsed.redFlags || []).map((f, i) => ({
            description: f.description,
            category: f.category,
            flagId: f.flagId || computedTrends.redFlags[i]?._id || computedTrends.redFlags[0]?._id,
          })),
          yellowFlags: (parsed.yellowFlags || []).map((f, i) => ({
            description: f.description,
            category: f.category,
            flagId: f.flagId || computedTrends.yellowFlags[i]?._id || computedTrends.yellowFlags[0]?._id,
          })),
          positiveProgress: parsed.positiveProgress,
          trends: {
            weight: computedTrends.weightTrend,
            adherencePct: computedTrends.adherencePct,
            sleepAvg: computedTrends.sleepAvg,
            activityAvg: computedTrends.activityAvg,
            hydrationAvg: computedTrends.hydrationAvg,
          },
          patientConcerns: parsed.patientConcerns || computedTrends.patientConcerns,
          followUp: parsed.followUp || [],
          generatedAt: new Date(),
        };

        const savedReport = await Report.create(reportData);
        console.log(`[Report Generator] Gemini Generated Report saved successfully (${savedReport._id})`);
        return savedReport;
      } catch (err) {
        lastError = err.message;
        retryAttempt++;
        console.warn(`[Report Generator Gemini Error] Attempt ${retryAttempt}/2 failed: ${err.message}`);
      }
    }
    console.warn('[Report Generator] LLM generation failed twice or threw error. Falling back to template generator.');
  }

  // 3. Fallback to template-based report generator (ensures report generation NEVER hard-fails)
  const fallbackData = generateTemplateFallbackReport(patient, computedTrends, periodStart, periodEnd);
  const savedFallbackReport = await Report.create(fallbackData);
  console.log(`[Report Generator] Template Fallback Report saved successfully (${savedFallbackReport._id})`);
  return savedFallbackReport;
}

export default generateClinicianReport;
