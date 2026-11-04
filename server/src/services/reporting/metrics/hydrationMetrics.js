/**
 * Hydration Metrics Calculator
 * Computes deterministic fluid intake statistics.
 * Normalizes glasses (250 mL/glass) while preserving original units and measurement counts.
 */
export function calculateHydrationMetrics(aggregatedData) {
  const { rawObservations = [], rawCheckins = [], previousReport } = aggregatedData;

  const validIntakesMl = [];
  let glassesCountTotal = 0;
  let missingCount = 0;
  let approximateCount = 0;
  const contributingObservationIds = [];

  // 1. Process atomic observations
  const hydObs = rawObservations.filter((o) => o.observationCategory === 'hydration');

  hydObs.forEach((obs) => {
    contributingObservationIds.push(obs._id.toString());

    if (obs.valueType === 'missing' || obs.missingReason) {
      missingCount++;
      return;
    }

    if (obs.observationCode === 'FLUID_INTAKE') {
      const val = obs.valueQuantity?.value;
      const unit = (obs.valueQuantity?.unit || 'ml').toLowerCase();

      if (typeof val === 'number' && !isNaN(val) && val >= 0) {
        if (unit === 'glasses') {
          glassesCountTotal += val;
          validIntakesMl.push(val * 250);
        } else {
          validIntakesMl.push(val);
        }
        if (obs.valueQuantity.isApproximate) approximateCount++;
      } else {
        missingCount++;
      }
    }
  });

  // 2. Fall back to checkins if no atomic observations
  if (hydObs.length === 0 && rawCheckins.length > 0) {
    rawCheckins.forEach((chk) => {
      if (chk.hydration) {
        if (typeof chk.hydration.estimatedMl === 'number' && !isNaN(chk.hydration.estimatedMl) && chk.hydration.estimatedMl >= 0) {
          validIntakesMl.push(chk.hydration.estimatedMl);
        } else if (typeof chk.hydration.glasses === 'number' && !isNaN(chk.hydration.glasses) && chk.hydration.glasses >= 0) {
          glassesCountTotal += chk.hydration.glasses;
          validIntakesMl.push(chk.hydration.glasses * 250);
        } else {
          missingCount++;
        }
      } else {
        missingCount++;
      }
    });
  }

  const validCount = validIntakesMl.length;
  let hydrationAvg = null;
  let hydrationTrend = 'insufficient_data';

  if (validCount > 0) {
    const total = validIntakesMl.reduce((s, v) => s + v, 0);
    hydrationAvg = Math.round(total / validCount);

    if (validCount >= 4) {
      const half = Math.floor(validCount / 2);
      const firstHalf = validIntakesMl.slice(0, half).reduce((s, v) => s + v, 0) / half;
      const secondHalf = validIntakesMl.slice(half).reduce((s, v) => s + v, 0) / (validCount - half);
      if (secondHalf - firstHalf >= 200) hydrationTrend = 'improving';
      else if (firstHalf - secondHalf >= 200) hydrationTrend = 'declining';
      else hydrationTrend = 'stable';
    } else {
      hydrationTrend = 'stable';
    }
  }

  // Previous report comparison
  const prevHydrationAvg = previousReport?.trends?.hydrationAvg ?? previousReport?.deterministicMetrics?.hydrationMetrics?.hydrationAvg ?? null;
  let comparisonTrend = 'stable';
  if (hydrationAvg !== null && prevHydrationAvg !== null) {
    if (hydrationAvg - prevHydrationAvg >= 200) comparisonTrend = 'improving';
    else if (prevHydrationAvg - hydrationAvg >= 200) comparisonTrend = 'declining';
  }

  return {
    validCount,
    missingCount,
    approximateCount,
    hydrationAvg,
    hydrationTrend,
    normalizedUnit: 'mL/day',
    glassesCountTotal,
    previousHydrationAvg: prevHydrationAvg,
    comparisonTrend,
    calculationStatus: validCount === 0 ? 'INSUFFICIENT_DATA' : missingCount > 0 ? 'PARTIAL' : 'COMPLETE',
    contributingObservationIds,
  };
}

export default calculateHydrationMetrics;
