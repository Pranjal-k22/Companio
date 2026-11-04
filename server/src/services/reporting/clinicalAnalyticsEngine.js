import { calculateMedicationAdherence } from './metrics/medicationAdherence.js';
import { calculateSleepMetrics } from './metrics/sleepMetrics.js';
import { calculateHydrationMetrics } from './metrics/hydrationMetrics.js';
import { calculateActivityMetrics } from './metrics/activityMetrics.js';
import { calculateSymptomMetrics } from './metrics/symptomMetrics.js';
import { calculateWellbeingMetrics } from './metrics/wellbeingMetrics.js';
import { calculateWeightMetrics } from './metrics/weightMetrics.js';
import { calculateDataCompleteness } from './metrics/dataCompleteness.js';

/**
 * Deterministic Clinical Analytics Engine
 * Executes pure JavaScript calculations on aggregated patient data.
 * The AI MUST NOT compute averages, percentages, or medical trend directions.
 */
export class ClinicalAnalyticsEngine {
  /**
   * Computes comprehensive clinical metrics from aggregated patient data.
   *
   * @param {object} aggregatedData - Output of ReportDataAggregator
   * @returns {object} Deterministic metrics bundle with provenance and completeness
   */
  static computeClinicalMetrics(aggregatedData) {
    if (!aggregatedData) {
      throw new Error('aggregatedData is required for clinical analytics');
    }

    // 1. Calculate each domain deterministically
    const medicationAdherence = calculateMedicationAdherence(aggregatedData);
    const sleepMetrics = calculateSleepMetrics(aggregatedData);
    const hydrationMetrics = calculateHydrationMetrics(aggregatedData);
    const activityMetrics = calculateActivityMetrics(aggregatedData);
    const symptomMetrics = calculateSymptomMetrics(aggregatedData);
    const wellbeingMetrics = calculateWellbeingMetrics(aggregatedData);
    const weightMetrics = calculateWeightMetrics(aggregatedData);

    // 2. Audit completeness and clinical limitations
    const completeness = calculateDataCompleteness({
      aggregatedData,
      medicationAdherence,
      sleepMetrics,
      hydrationMetrics,
      activityMetrics,
      symptomMetrics,
    });

    // 3. Aggregate all contributing observation IDs
    const allContributingObservationIds = [
      ...new Set([
        ...medicationAdherence.contributingObservationIds,
        ...sleepMetrics.contributingObservationIds,
        ...hydrationMetrics.contributingObservationIds,
        ...activityMetrics.contributingObservationIds,
        ...symptomMetrics.contributingObservationIds,
        ...wellbeingMetrics.contributingObservationIds,
        ...weightMetrics.contributingObservationIds,
      ]),
    ];

    // 4. Construct backward-compatible trends object for legacy UI and Report schema
    const legacyTrends = {
      adherencePct: medicationAdherence.adherencePct ?? 100,
      sleepAvg: sleepMetrics.sleepAvg ?? 7.5,
      sleepTrend: sleepMetrics.sleepTrend,
      activityAvg: activityMetrics.activityAvg ?? 30,
      activityTrend: activityMetrics.activityTrend,
      hydrationAvg: hydrationMetrics.hydrationAvg ?? 2000,
      hydrationTrend: hydrationMetrics.hydrationTrend,
      weight: weightMetrics.measurements.map((m) => ({ date: m.date, value: m.value })),
    };

    return {
      deterministicMetrics: {
        medicationAdherence,
        sleepMetrics,
        hydrationMetrics,
        activityMetrics,
        symptomMetrics,
        wellbeingMetrics,
        weightMetrics,
      },
      trends: legacyTrends,
      dataCompleteness: completeness,
      allContributingObservationIds,
      computedAt: new Date(),
    };
  }
}

export default ClinicalAnalyticsEngine;

