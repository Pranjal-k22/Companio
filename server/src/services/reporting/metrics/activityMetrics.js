/**
 * Physical Activity Metrics Calculator
 * Computes deterministic physical activity statistics from observations and check-ins.
 */
export function calculateActivityMetrics(aggregatedData) {
  const { rawObservations = [], rawCheckins = [], previousReport } = aggregatedData;

  const validDurations = [];
  const categoriesReported = new Set();
  let missingCount = 0;
  let approximateCount = 0;
  const contributingObservationIds = [];

  // 1. Process atomic observations
  const actObs = rawObservations.filter((o) => o.observationCategory === 'activity');

  actObs.forEach((obs) => {
    contributingObservationIds.push(obs._id.toString());

    if (obs.valueType === 'missing' || obs.missingReason) {
      missingCount++;
      return;
    }

    if (obs.observationCode === 'PHYSICAL_ACTIVITY') {
      const minutes = obs.valueQuantity?.value;
      if (typeof minutes === 'number' && !isNaN(minutes) && minutes >= 0) {
        validDurations.push(minutes);
        if (obs.valueQuantity.isApproximate) approximateCount++;
      } else {
        missingCount++;
      }
      if (obs.valueString) categoriesReported.add(obs.valueString);
    }
  });

  // 2. Fall back to checkins if no atomic observations
  if (actObs.length === 0 && rawCheckins.length > 0) {
    rawCheckins.forEach((chk) => {
      if (chk.activity) {
        if (typeof chk.activity.minutesActive === 'number' && !isNaN(chk.activity.minutesActive) && chk.activity.minutesActive >= 0) {
          validDurations.push(chk.activity.minutesActive);
          if (chk.activity.type) categoriesReported.add(chk.activity.type);
        } else {
          missingCount++;
        }
      } else {
        missingCount++;
      }
    });
  }

  const validCount = validDurations.length;
  let activityAvg = null;
  let activityTrend = 'insufficient_data';

  if (validCount > 0) {
    const total = validDurations.reduce((s, v) => s + v, 0);
    activityAvg = Math.round(total / validCount);

    if (validCount >= 4) {
      const half = Math.floor(validCount / 2);
      const firstHalf = validDurations.slice(0, half).reduce((s, v) => s + v, 0) / half;
      const secondHalf = validDurations.slice(half).reduce((s, v) => s + v, 0) / (validCount - half);
      if (secondHalf - firstHalf >= 5) activityTrend = 'improving';
      else if (firstHalf - secondHalf >= 5) activityTrend = 'declining';
      else activityTrend = 'stable';
    } else {
      activityTrend = 'stable';
    }
  }

  // Previous report comparison
  const prevActivityAvg = previousReport?.trends?.activityAvg ?? previousReport?.deterministicMetrics?.activityMetrics?.activityAvg ?? null;
  let comparisonTrend = 'stable';
  if (activityAvg !== null && prevActivityAvg !== null) {
    if (activityAvg - prevActivityAvg >= 5) comparisonTrend = 'improving';
    else if (prevActivityAvg - activityAvg >= 5) comparisonTrend = 'declining';
  }

  return {
    validCount,
    missingCount,
    approximateCount,
    activityAvg,
    activityTrend,
    unit: 'minutes/day',
    categories: Array.from(categoriesReported),
    previousActivityAvg: prevActivityAvg,
    comparisonTrend,
    calculationStatus: validCount === 0 ? 'INSUFFICIENT_DATA' : missingCount > 0 ? 'PARTIAL' : 'COMPLETE',
    contributingObservationIds,
  };
}

export default calculateActivityMetrics;
