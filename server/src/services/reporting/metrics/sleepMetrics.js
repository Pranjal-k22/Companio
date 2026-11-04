/**
 * Sleep Metrics Calculator
 * Computes deterministic sleep statistics.
 * CRITICAL RULE: Missing sleep is NEVER treated as 0 hours. Averages only divide by valid observations.
 */
export function calculateSleepMetrics(aggregatedData) {
  const { rawObservations = [], rawCheckins = [], previousReport } = aggregatedData;

  const validDurations = [];
  const qualityDistribution = { poor: 0, fair: 0, good: 0 };
  let interruptionsReported = 0;
  let missingCount = 0;
  let approximateCount = 0;
  const contributingObservationIds = [];

  // 1. Process atomic observations first
  const sleepObs = rawObservations.filter((o) => o.observationCategory === 'sleep');

  sleepObs.forEach((obs) => {
    contributingObservationIds.push(obs._id.toString());

    if (obs.valueType === 'missing' || obs.missingReason) {
      missingCount++;
      return;
    }

    if (obs.observationCode === 'SLEEP_DURATION') {
      const hours = obs.valueQuantity?.value;
      if (typeof hours === 'number' && !isNaN(hours) && hours >= 0 && hours <= 24) {
        validDurations.push(hours);
        if (obs.valueQuantity.isApproximate) approximateCount++;
      } else {
        missingCount++;
      }
    } else if (obs.observationCode === 'SLEEP_QUALITY') {
      const q = (obs.valueString || '').toLowerCase();
      if (q.includes('poor')) qualityDistribution.poor++;
      else if (q.includes('good') || q.includes('great')) qualityDistribution.good++;
      else if (q.includes('fair') || q.includes('okay')) qualityDistribution.fair++;
    }
  });

  // 2. If no atomic observations, fall back to checkins
  if (sleepObs.length === 0 && rawCheckins.length > 0) {
    rawCheckins.forEach((chk) => {
      if (chk.sleep) {
        if (typeof chk.sleep.hours === 'number' && !isNaN(chk.sleep.hours) && chk.sleep.hours >= 0 && chk.sleep.hours <= 24) {
          validDurations.push(chk.sleep.hours);
        } else {
          missingCount++;
        }

        if (chk.sleep.quality) {
          const q = chk.sleep.quality.toLowerCase();
          if (qualityDistribution[q] !== undefined) {
            qualityDistribution[q]++;
          }
        }
      } else {
        missingCount++;
      }
    });
  }

  const validCount = validDurations.length;
  let sleepAvg = null;
  let sleepTrend = 'insufficient_data';

  if (validCount > 0) {
    const total = validDurations.reduce((sum, val) => sum + val, 0);
    sleepAvg = parseFloat((total / validCount).toFixed(1));

    // Internal trend (split-half if sufficient observations)
    if (validCount >= 4) {
      const half = Math.floor(validCount / 2);
      const firstHalf = validDurations.slice(0, half).reduce((s, v) => s + v, 0) / half;
      const secondHalf = validDurations.slice(half).reduce((s, v) => s + v, 0) / (validCount - half);
      if (secondHalf - firstHalf >= 0.5) sleepTrend = 'improving';
      else if (firstHalf - secondHalf >= 0.5) sleepTrend = 'declining';
      else sleepTrend = 'stable';
    } else {
      sleepTrend = 'stable';
    }
  }

  // Compare with previous report
  const prevSleepAvg = previousReport?.trends?.sleepAvg ?? previousReport?.deterministicMetrics?.sleepMetrics?.sleepAvg ?? null;
  let comparisonTrend = 'stable';
  if (sleepAvg !== null && prevSleepAvg !== null) {
    if (sleepAvg - prevSleepAvg >= 0.5) comparisonTrend = 'improving';
    else if (prevSleepAvg - sleepAvg >= 0.5) comparisonTrend = 'declining';
  }

  return {
    validCount,
    missingCount,
    approximateCount,
    sleepAvg,
    sleepTrend,
    qualityDistribution,
    interruptionsReported,
    previousSleepAvg: prevSleepAvg,
    comparisonTrend,
    calculationStatus: validCount === 0 ? 'INSUFFICIENT_DATA' : missingCount > 0 ? 'PARTIAL' : 'COMPLETE',
    contributingObservationIds,
  };
}

export default calculateSleepMetrics;

