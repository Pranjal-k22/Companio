/**
 * Wellbeing Metrics Calculator
 * Computes deterministic statistics on patient mood, social connection, and wellbeing scores.
 */
export function calculateWellbeingMetrics(aggregatedData) {
  const { rawObservations = [], rawCheckins = [], previousReport } = aggregatedData;

  const validScores = [];
  const moodsReported = [];
  let lonelinessReported = false;
  const contributingObservationIds = [];

  // 1. Process atomic observations
  const wellObs = rawObservations.filter(
    (o) => o.observationCategory === 'wellbeing' || o.observationCategory === 'social'
  );

  wellObs.forEach((obs) => {
    contributingObservationIds.push(obs._id.toString());

    if (obs.valueType === 'missing' || obs.missingReason) return;

    if (obs.observationCode === 'WELLBEING_SCORE') {
      const score = obs.valueQuantity?.value;
      if (typeof score === 'number' && !isNaN(score) && score >= 1 && score <= 10) {
        validScores.push(score);
      }
    } else if (obs.observationCode === 'SOCIAL_ISOLATION') {
      if (obs.valueBoolean === true || (obs.valueString && obs.valueString.toLowerCase().includes('lonel'))) {
        lonelinessReported = true;
      }
    } else if (obs.valueString) {
      moodsReported.push(obs.valueString);
    }
  });

  // 2. Fall back to checkins if no atomic observations
  if (wellObs.length === 0 && rawCheckins.length > 0) {
    rawCheckins.forEach((chk) => {
      if (typeof chk.wellbeingScore === 'number' && !isNaN(chk.wellbeingScore) && chk.wellbeingScore >= 1 && chk.wellbeingScore <= 10) {
        validScores.push(chk.wellbeingScore);
      }
      if (chk.socialIsolation?.feelsIsolated || chk.socialIsolation?.lonelinessReported) {
        lonelinessReported = true;
      }
    });
  }

  const validCount = validScores.length;
  let averageScore = null;
  let wellbeingTrend = 'stable';

  if (validCount > 0) {
    averageScore = parseFloat((validScores.reduce((s, v) => s + v, 0) / validCount).toFixed(1));
    if (validCount >= 4) {
      const half = Math.floor(validCount / 2);
      const first = validScores.slice(0, half).reduce((s, v) => s + v, 0) / half;
      const second = validScores.slice(half).reduce((s, v) => s + v, 0) / (validCount - half);
      if (second - first >= 1.0) wellbeingTrend = 'improving';
      else if (first - second >= 1.0) wellbeingTrend = 'declining';
    }
  }

  return {
    averageScore,
    validCount,
    wellbeingTrend,
    moodsReported: [...new Set(moodsReported)],
    lonelinessReported,
    contributingObservationIds,
  };
}

export default calculateWellbeingMetrics;
