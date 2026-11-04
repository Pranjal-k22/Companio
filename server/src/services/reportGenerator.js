import { Patient, Report, Checkin, Flag } from '../models/index.js';
import { ReportDataAggregator } from './reporting/reportDataAggregator.js';
import { ClinicalAnalyticsEngine } from './reporting/clinicalAnalyticsEngine.js';
import { ReportFlagIntegrator } from './reporting/reportFlagIntegrator.js';
import { ReportNarrationService } from './reporting/reportNarrationService.js';
import { ReportValidationService } from './reporting/reportValidationService.js';
import { ReportProvenanceService } from './reporting/reportProvenanceService.js';
import { ReportVersionService } from './reporting/reportVersionService.js';
import logger from '../utils/logger.js';

/**
 * Backward-compatible computeClinicalTrends function.
 * Evaluates ground-truth clinical trends using plain JS statistics.
 *
 * @param {string} patientId - Mongoose ObjectId string
 * @param {Date} startDate - Period start
 * @param {Date} endDate - Period end
 * @returns {Promise<object>} Ground-truth trends object
 */
export async function computeClinicalTrends(patientId, startDate, endDate) {
  const patient = await Patient.findById(patientId);
  const organizationId = patient?.organizationId;

  // If organizationId is available, use the new ReportDataAggregator & ClinicalAnalyticsEngine
  if (organizationId) {
    try {
      const aggregated = await ReportDataAggregator.aggregateReportData({
        patientId,
        organizationId,
        periodStart: startDate,
        periodEnd: endDate,
      });

      const analytics = ClinicalAnalyticsEngine.computeClinicalMetrics(aggregated);
      const flagSummary = ReportFlagIntegrator.processFlagsForReport({
        allRelevantFlags: aggregated.allRelevantFlags,
        periodStart: startDate,
        periodEnd: endDate,
      });

      return {
        totalCheckins: aggregated.rawCheckins.length || aggregated.rawObservations.length,
        adherencePct: analytics.trends.adherencePct,
        missedDoses: analytics.deterministicMetrics.medicationAdherence?.missedDoses || 0,
        sleepAvg: analytics.trends.sleepAvg,
        sleepTrend: analytics.trends.sleepTrend,
        hydrationAvg: analytics.trends.hydrationAvg,
        hydrationTrend: analytics.trends.hydrationTrend,
        activityAvg: analytics.trends.activityAvg,
        activityTrend: analytics.trends.activityTrend,
        symptomFrequency: analytics.deterministicMetrics.symptomMetrics?.symptomFrequency || {},
        flagCounts: flagSummary.flagCounts,
        redFlags: flagSummary.activeRedFlags.map((f) => ({
          _id: f.flagId,
          category: f.category,
          description: f.description,
          severity: 'red',
        })),
        yellowFlags: flagSummary.activeYellowFlags.map((f) => ({
          _id: f.flagId,
          category: f.category,
          description: f.description,
          severity: 'yellow',
        })),
        weightTrend: analytics.trends.weight,
        patientConcerns: aggregated.explicitConcerns.map((c) => c.text),
        checkinSummaries: [],
      };
    } catch (err) {
      logger.warn(`[computeClinicalTrends] Aggregator fallback: ${err.message}`);
    }
  }

  // Baseline fallback query logic if patient unassigned
  const orgFilter = organizationId ? { organizationId } : {};
  const query = {
    patientId,
    timestamp: { $gte: startDate, $lte: endDate },
    ...orgFilter,
  };

  const checkins = await Checkin.find(query).sort({ timestamp: 1 });
  const flags = await Flag.find({
    patientId,
    createdAt: { $gte: startDate, $lte: endDate },
    ...orgFilter,
  }).sort({ createdAt: -1 });

  const redFlags = flags.filter((f) => f.severity === 'red');
  const yellowFlags = flags.filter((f) => f.severity === 'yellow');

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

  let totalDosesExpected = 0;
  let totalDosesTaken = 0;
  let missedDosesCount = 0;
  let totalSleep = 0;
  let totalHydration = 0;
  let totalActivity = 0;
  const symptomCounts = {};
  const concernsSet = new Set();
  const weightTrend = [];

  checkins.forEach((c) => {
    if (c.adherence) {
      const missed = c.adherence.missedDoses || 0;
      missedDosesCount += missed;
      const taken = c.adherence.taken ? 1 : 0;
      totalDosesTaken += taken;
      totalDosesExpected += taken + missed;
    }
    if (c.sleep?.hours) totalSleep += c.sleep.hours;
    if (c.hydration?.estimatedMl) totalHydration += c.hydration.estimatedMl;
    else if (c.hydration?.glasses) totalHydration += c.hydration.glasses * 250;
    if (c.activity?.minutesActive) totalActivity += c.activity.minutesActive;

    if (c.symptoms && Array.isArray(c.symptoms)) {
      c.symptoms.forEach((s) => {
        if (s.name) symptomCounts[s.name] = (symptomCounts[s.name] || 0) + 1;
      });
    }
    if (c.patientConcerns && Array.isArray(c.patientConcerns)) {
      c.patientConcerns.forEach((concern) => {
        if (concern && typeof concern === 'string') concernsSet.add(concern);
      });
    }
    if (c.weight) {
      weightTrend.push({ date: new Date(c.timestamp).toLocaleDateString(), value: c.weight });
    }
  });

  const count = checkins.length;
  const adherencePct = totalDosesExpected > 0 ? Math.round((totalDosesTaken / totalDosesExpected) * 100) : 100;
  const sleepAvg = parseFloat((totalSleep / count).toFixed(1));
  const hydrationAvg = Math.round(totalHydration / count);
  const activityAvg = Math.round(totalActivity / count);

  return {
    totalCheckins: count,
    adherencePct,
    missedDoses: missedDosesCount,
    sleepAvg,
    sleepTrend: 'stable',
    hydrationAvg,
    hydrationTrend: 'stable',
    activityAvg,
    activityTrend: 'stable',
    symptomFrequency: symptomCounts,
    flagCounts: { red: redFlagsByCategory, yellow: yellowFlagsByCategory },
    redFlags,
    yellowFlags,
    weightTrend,
    patientConcerns: Array.from(concernsSet),
    checkinSummaries: [],
  };
}

/**
 * Backward-compatible generateTemplateFallbackReport.
 */
export function generateTemplateFallbackReport(patient, computedTrends, periodStart, periodEnd) {
  const redFlagRefs = (computedTrends.redFlags || []).map((f) => ({
    description: f.description,
    category: f.category,
    flagId: f._id || f.flagId,
    severity: 'red',
  }));

  const yellowFlagRefs = (computedTrends.yellowFlags || []).map((f) => ({
    description: f.description,
    category: f.category,
    flagId: f._id || f.flagId,
    severity: 'yellow',
  }));

  const overview = `${patient.name} completed ${computedTrends.totalCheckins || 0} voice check-ins between ${new Date(periodStart).toLocaleDateString()} and ${new Date(periodEnd).toLocaleDateString()}. Overall medication adherence is ${computedTrends.adherencePct}%. ${
    redFlagRefs.length > 0 ? `⚠️ ${redFlagRefs.length} RED FLAG(S) detected requiring clinician review.` : 'No red flags detected.'
  }`;

  const positiveProgress = [
    `Maintained average daily physical activity of ${computedTrends.activityAvg} minutes (${computedTrends.activityTrend || 'stable'} trend).`,
    `Hydration intake averaged ${computedTrends.hydrationAvg} mL/day (${computedTrends.hydrationTrend || 'stable'} trend).`,
    `Average sleep recorded at ${computedTrends.sleepAvg} hours/night (${computedTrends.sleepTrend || 'stable'} trend).`,
  ];

  const followUp = [];
  if (redFlagRefs.length > 0) {
    followUp.push(`Urgent follow-up required regarding ${redFlagRefs[0].category.replace('_', ' ')}.`);
  }
  if (computedTrends.adherencePct < 90) {
    followUp.push('Review medication adherence schedule and potential side effects.');
  }

  return {
    patientId: patient._id,
    organizationId: patient.organizationId,
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
    patientConcerns: computedTrends.patientConcerns || [],
    followUp,
    generatedAt: new Date(),
  };
}

/**
 * Main Enterprise Clinician Report Generator Service
 * Executes the full Phase 7 clinical reporting lifecycle:
 * Aggregation ➔ Deterministic Analytics ➔ Narration (Gemini / Fallback) ➔ Validation ➔ Provenance ➔ Version Management.
 *
 * @param {string} patientId - Target patient ObjectId string
 * @param {Date} periodStart - Period start date
 * @param {Date} periodEnd - Period end date
 * @param {object} [options={}] - Optional configuration
 * @returns {Promise<object>} Created Mongoose Report document (v1, v2, etc.)
 */
export async function generateClinicianReport(patientId, periodStart, periodEnd, options = {}) {
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new Error('Patient record not found.');
  }

  const organizationId = options.organizationId || patient.organizationId;
  const reportType = options.reportType || 'WEEKLY_REPORT';

  // 1. Aggregate clinical data with tenant scoping & snapshot
  const aggregatedData = await ReportDataAggregator.aggregateReportData({
    patientId: patient._id,
    organizationId,
    periodStart,
    periodEnd,
    reportType,
  });

  // 2. Compute deterministic clinical metrics in pure JavaScript
  const clinicalMetrics = ClinicalAnalyticsEngine.computeClinicalMetrics(aggregatedData);

  // 3. Partition flags
  const flagSummary = ReportFlagIntegrator.processFlagsForReport({
    allRelevantFlags: aggregatedData.allRelevantFlags,
    periodStart,
    periodEnd,
  });

  // 4. Generate Narration (Gemini 2.0/3.8 Flash with structured schema or Deterministic Template)
  const { narration, narrationMode, modelUsed } = await ReportNarrationService.generateNarration({
    patient,
    periodStart,
    periodEnd,
    clinicalMetrics,
    flagSummary,
    explicitConcerns: aggregatedData.explicitConcerns,
    patientQuestions: aggregatedData.patientQuestions,
  });

  // 5. Validate Narration against deterministic metrics
  const validation = ReportValidationService.validateReport({
    narration,
    clinicalMetrics,
    flagSummary,
    periodStart,
    periodEnd,
    organizationId,
  });

  // 6. Build Evidence Graph
  const evidenceReferences = ReportProvenanceService.buildEvidenceGraph({
    narration,
    clinicalMetrics,
    flagSummary,
  });

  // 7. Assemble Report Document Payload
  const reportData = {
    patientId: patient._id,
    organizationId,
    reportType,
    periodStart,
    periodEnd,
    overview: narration.overview,
    redFlags: narration.redFlags,
    yellowFlags: narration.yellowFlags,
    positiveProgress: narration.positiveProgress,
    trends: clinicalMetrics.trends,
    deterministicMetrics: clinicalMetrics.deterministicMetrics,
    dataCompleteness: clinicalMetrics.dataCompleteness,
    patientConcerns: narration.patientConcerns,
    followUp: narration.clinicianFollowUp,
    aiSuggestions: narration.aiSuggestions,
    clinicianTasks: [],
    narrationMode,
    validationStatus: validation.isValid ? 'VALIDATED' : 'FAILED',
    validationDetails: {
      errors: validation.errors,
      warnings: validation.warnings,
      validatedAt: validation.validatedAt,
    },
    sourceSnapshot: aggregatedData.sourceSnapshot,
    evidenceReferences,
    status: options.initialStatus || 'PENDING_REVIEW', // Created as PENDING_REVIEW; NEVER automatically approved
  };

  // 8. Create versioned Report through ReportVersionService (handles idempotency & version increments)
  const savedReport = await ReportVersionService.createOrVersionReport({
    reportData,
    existingReportId: options.existingReportId,
    amendmentReason: options.amendmentReason,
    amendedByUserId: options.amendedByUserId,
  });

  logger.info(`[Report Generator] Clinical Report v${savedReport.version} saved successfully (${savedReport._id}) [Mode: ${narrationMode}]`);
  return savedReport;
}

export default generateClinicianReport;
