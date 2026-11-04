import assert from 'assert';
import { calculateMedicationAdherence } from '../../services/reporting/metrics/medicationAdherence.js';
import { calculateSleepMetrics } from '../../services/reporting/metrics/sleepMetrics.js';
import { calculateHydrationMetrics } from '../../services/reporting/metrics/hydrationMetrics.js';
import { calculateActivityMetrics } from '../../services/reporting/metrics/activityMetrics.js';
import { calculateWeightMetrics } from '../../services/reporting/metrics/weightMetrics.js';
import { calculateSymptomMetrics } from '../../services/reporting/metrics/symptomMetrics.js';

export async function runTestClinicalMetrics() {
  console.log('\n🧪 Testing Clinical Metrics Deterministic Calculations (testClinicalMetrics.js)...');

  // 1. Medication Adherence with unknown and declined doses
  const dummyMedsData = {
    rawObservations: [
      { _id: 'obs1', observationCategory: 'medication', valueBoolean: true },
      { _id: 'obs2', observationCategory: 'medication', valueBoolean: true },
      { _id: 'obs3', observationCategory: 'medication', valueBoolean: false },
      { _id: 'obs4', observationCategory: 'medication', valueType: 'missing', missingReason: 'UNKNOWN' },
      { _id: 'obs5', observationCategory: 'medication', valueType: 'missing', missingReason: 'DECLINED' },
    ],
  };

  const medResult = calculateMedicationAdherence(dummyMedsData);
  assert.strictEqual(medResult.expectedDoses, 5, 'Expected 5 doses total');
  assert.strictEqual(medResult.takenDoses, 2, 'Taken doses must be 2');
  assert.strictEqual(medResult.missedDoses, 1, 'Missed doses must be 1');
  assert.strictEqual(medResult.unknownDoses, 1, 'Unknown doses must be 1');
  assert.strictEqual(medResult.declinedDoses, 1, 'Declined doses must be 1');
  assert.strictEqual(medResult.knownDoses, 3, 'Known doses denominator must be 3 (2 taken + 1 missed)');
  assert.strictEqual(medResult.adherencePct, 67, 'Adherence % must be Math.round(2/3 * 100) = 67%');
  console.log('  ✔ [PASS] Medication Adherence defensible denominator calculation: 2/3 = 67% (unknowns excluded from denominator)');

  // 2. Sleep Metrics: Missing values are never converted to 0
  const dummySleepData = {
    rawObservations: [
      { _id: 's1', observationCategory: 'sleep', observationCode: 'SLEEP_DURATION', valueQuantity: { value: 7, unit: 'hours' } },
      { _id: 's2', observationCategory: 'sleep', observationCode: 'SLEEP_DURATION', valueQuantity: { value: 9, unit: 'hours' } },
      { _id: 's3', observationCategory: 'sleep', observationCode: 'SLEEP_DURATION', valueType: 'missing', missingReason: 'DECLINED' },
    ],
  };

  const sleepResult = calculateSleepMetrics(dummySleepData);
  assert.strictEqual(sleepResult.validCount, 2, 'Valid sleep observations must be 2');
  assert.strictEqual(sleepResult.missingCount, 1, 'Missing count must be 1');
  assert.strictEqual(sleepResult.sleepAvg, 8.0, 'Sleep average must be (7 + 9) / 2 = 8.0, NOT 16 / 3');
  console.log('  ✔ [PASS] Sleep Metrics: Missing sleep is never zeroed (avg = 8.0 hours)');

  // 3. Hydration Unit Consistency (glasses normalized to mL)
  const dummyHydrationData = {
    rawObservations: [
      { _id: 'h1', observationCategory: 'hydration', observationCode: 'FLUID_INTAKE', valueQuantity: { value: 4, unit: 'glasses' } }, // 4 * 250 = 1000
      { _id: 'h2', observationCategory: 'hydration', observationCode: 'FLUID_INTAKE', valueQuantity: { value: 1500, unit: 'ml' } },
    ],
  };

  const hydResult = calculateHydrationMetrics(dummyHydrationData);
  assert.strictEqual(hydResult.validCount, 2, 'Valid count must be 2');
  assert.strictEqual(hydResult.hydrationAvg, 1250, 'Hydration average must be (1000 + 1500) / 2 = 1250 mL');
  console.log('  ✔ [PASS] Hydration Metrics: Normalized glasses (4 -> 1000 mL) + 1500 mL = avg 1250 mL');

  // 4. Weight Metrics: Units check
  const dummyWeightData = {
    rawObservations: [
      { _id: 'w1', observationCategory: 'vital', observationCode: 'BODY_WEIGHT', valueQuantity: { value: 165, unit: 'lbs' }, effectiveDateTime: new Date('2026-10-01') },
      { _id: 'w2', observationCategory: 'vital', observationCode: 'BODY_WEIGHT', valueQuantity: { value: 168, unit: 'lbs' }, effectiveDateTime: new Date('2026-10-07') },
    ],
  };

  const weightResult = calculateWeightMetrics(dummyWeightData);
  assert.strictEqual(weightResult.latestWeight, 168);
  assert.strictEqual(weightResult.weightChange, 3.0);
  assert.strictEqual(weightResult.direction, 'increasing');
  console.log('  ✔ [PASS] Weight Metrics: Unit consistency verified, change +3.0 lbs detected');

  return true;
}

export default runTestClinicalMetrics;
