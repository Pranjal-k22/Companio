import assert from 'assert';
import { calculateDataCompleteness } from '../../services/reporting/metrics/dataCompleteness.js';

export async function runTestMissingData() {
  console.log('\n🧪 Testing Missing Data & Clinical Completeness (testMissingData.js)...');

  const dummyAggregated = {
    periodStart: new Date('2026-10-01'),
    periodEnd: new Date('2026-10-08'), // 7 days -> 28 expected data points
    rawObservations: [
      { _id: 'o1', observationCategory: 'medication', valueBoolean: true, validationStatus: 'VALIDATED' },
      { _id: 'o2', observationCategory: 'sleep', valueQuantity: { value: 7, unit: 'hours' }, validationStatus: 'VALIDATED' },
      { _id: 'o3', observationCategory: 'hydration', valueType: 'missing', missingReason: 'DECLINED', validationStatus: 'VALIDATED' },
      { _id: 'o4', observationCategory: 'activity', valueQuantity: { value: 30, unit: 'mins' }, validationStatus: 'VALIDATED' },
    ],
  };

  const dummyMetrics = {
    aggregatedData: dummyAggregated,
    medicationAdherence: { calculationStatus: 'PARTIAL', unknownDoses: 1 },
    sleepMetrics: { calculationStatus: 'COMPLETE' },
    hydrationMetrics: { calculationStatus: 'INSUFFICIENT_DATA' },
    activityMetrics: { calculationStatus: 'COMPLETE' },
    symptomMetrics: { totalReportedSymptoms: 0 },
  };

  const completeness = calculateDataCompleteness(dummyMetrics);

  assert.strictEqual(completeness.daysInPeriod, 7, 'Days in period must be 7');
  assert.strictEqual(completeness.declinedObservations, 1, 'Declined observations count must be 1');
  assert(completeness.limitations.length > 0, 'Limitations array must not be empty');

  const hasDeclinedMention = completeness.limitations.some((l) => l.includes('declined'));
  assert(hasDeclinedMention, 'Must explicitly mention patient declined response');
  console.log('  ✔ [PASS] Missing data: Patient declined response recorded without coercing to zero');

  const hasHydrationMention = completeness.limitations.some((l) => l.includes('fluid') || l.includes('hydration'));
  assert(hasHydrationMention, 'Must explicitly mention insufficient fluid data');
  console.log('  ✔ [PASS] Missing data: Insufficient data limitation clearly surfaced');

  assert.strictEqual(completeness.overallStatus, 'INSUFFICIENT_DATA');
  console.log('  ✔ [PASS] Data Completeness overall status correctly marked INSUFFICIENT_DATA');

  return true;
}

export default runTestMissingData;

