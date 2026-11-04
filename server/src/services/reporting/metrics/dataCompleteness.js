/**
 * Data Completeness and Limitations Auditor
 * Evaluates observation coverage across required clinical domains for older adults.
 * Explicitly surfaces limitations, missing data, and declined responses.
 */
export function calculateDataCompleteness({
  aggregatedData,
  medicationAdherence,
  sleepMetrics,
  hydrationMetrics,
  activityMetrics,
  symptomMetrics,
}) {
  const { periodStart, periodEnd, rawObservations = [], rawCheckins = [] } = aggregatedData;

  const msInDay = 24 * 60 * 60 * 1000;
  const daysInPeriod = Math.max(1, Math.round((new Date(periodEnd) - new Date(periodStart)) / msInDay));

  // Expected 4 core check-in domains per day: meds, sleep, hydration, activity
  const expectedDataPoints = daysInPeriod * 4;

  let availableDataPoints = 0;
  let missingObservations = 0;
  let declinedObservations = 0;
  let invalidObservations = 0;
  const limitations = [];

  // Count from atomic observations
  rawObservations.forEach((obs) => {
    if (obs.validationStatus === 'REJECTED') {
      invalidObservations++;
    } else if (obs.valueType === 'missing' || obs.missingReason) {
      if (obs.missingReason === 'DECLINED') {
        declinedObservations++;
      } else {
        missingObservations++;
      }
    } else {
      availableDataPoints++;
    }
  });

  // If checkins used instead of observations
  if (rawObservations.length === 0 && rawCheckins.length > 0) {
    rawCheckins.forEach((chk) => {
      if (chk.adherence) availableDataPoints++; else missingObservations++;
      if (chk.sleep?.hours !== undefined) availableDataPoints++; else missingObservations++;
      if (chk.hydration?.estimatedMl !== undefined || chk.hydration?.glasses !== undefined) availableDataPoints++; else missingObservations++;
      if (chk.activity?.minutesActive !== undefined) availableDataPoints++; else missingObservations++;
    });
  }

  // Audit specific metric limitations
  if (medicationAdherence.calculationStatus === 'INSUFFICIENT_DATA') {
    limitations.push('Insufficient medication adherence data recorded during this reporting period.');
  } else if (medicationAdherence.unknownDoses > 0) {
    limitations.push(`${medicationAdherence.unknownDoses} medication dose status(es) could not be verified.`);
  }

  if (sleepMetrics.calculationStatus === 'INSUFFICIENT_DATA') {
    limitations.push('No valid sleep duration observations recorded; sleep trends could not be calculated.');
  }

  if (hydrationMetrics.calculationStatus === 'INSUFFICIENT_DATA') {
    limitations.push('No valid fluid intake data recorded during this period.');
  }

  if (activityMetrics.calculationStatus === 'INSUFFICIENT_DATA') {
    limitations.push('No physical activity recorded during this period.');
  }

  if (declinedObservations > 0) {
    limitations.push(`Patient declined to answer ${declinedObservations} check-in question(s). Refusal was respected.`);
  }

  const completenessRatio = expectedDataPoints > 0
    ? parseFloat(Math.min(1, availableDataPoints / expectedDataPoints).toFixed(2))
    : 1;

  let overallStatus = 'COMPLETE';
  if (completenessRatio < 0.5) overallStatus = 'INSUFFICIENT_DATA';
  else if (completenessRatio < 0.85 || limitations.length > 0) overallStatus = 'PARTIAL';

  return {
    daysInPeriod,
    expectedDataPoints,
    availableDataPoints,
    missingObservations,
    declinedObservations,
    invalidObservations,
    completenessRatio,
    overallStatus,
    limitations,
  };
}

export default calculateDataCompleteness;

