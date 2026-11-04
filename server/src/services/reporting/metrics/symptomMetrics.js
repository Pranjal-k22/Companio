/**
 * Symptom Metrics Calculator
 * Computes deterministic statistics on symptoms, pain, and side effects.
 * Tracks frequencies, severities, first/last reported timestamps, and observation provenance.
 */
export function calculateSymptomMetrics(aggregatedData) {
  const { rawObservations = [], rawCheckins = [] } = aggregatedData;

  const symptomRegistry = {};
  const contributingObservationIds = [];

  // 1. Process atomic observations
  const symptomObs = rawObservations.filter(
    (o) => o.observationCategory === 'symptom' || o.observationCode === 'PAIN_SEVERITY' || o.observationCode === 'ACUTE_SYMPTOM'
  );

  symptomObs.forEach((obs) => {
    contributingObservationIds.push(obs._id.toString());

    if (obs.valueType === 'missing' || obs.missingReason) return;

    let symptomName = obs.observationDisplay || 'Unspecified Symptom';
    let severity = 'mild';

    if (obs.observationCode === 'PAIN_SEVERITY') {
      const painVal = obs.valueQuantity?.value;
      symptomName = `Pain (${painVal !== undefined ? painVal + '/10' : 'reported'})`;
      severity = (painVal || 0) >= 7 ? 'severe' : (painVal || 0) >= 4 ? 'moderate' : 'mild';
    } else if (obs.valueString) {
      symptomName = obs.valueString;
    }

    const key = symptomName.toLowerCase().trim();
    if (!symptomRegistry[key]) {
      symptomRegistry[key] = {
        name: symptomName,
        count: 0,
        severities: [],
        firstReported: obs.effectiveDateTime,
        lastReported: obs.effectiveDateTime,
        observationIds: [],
      };
    }

    const item = symptomRegistry[key];
    item.count++;
    item.severities.push(severity);
    item.observationIds.push(obs._id.toString());

    if (new Date(obs.effectiveDateTime) < new Date(item.firstReported)) {
      item.firstReported = obs.effectiveDateTime;
    }
    if (new Date(obs.effectiveDateTime) > new Date(item.lastReported)) {
      item.lastReported = obs.effectiveDateTime;
    }
  });

  // 2. If no atomic observations, fall back to checkins
  if (symptomObs.length === 0 && rawCheckins.length > 0) {
    rawCheckins.forEach((chk) => {
      if (Array.isArray(chk.symptoms)) {
        chk.symptoms.forEach((s) => {
          if (!s.name) return;
          const key = s.name.toLowerCase().trim();
          if (!symptomRegistry[key]) {
            symptomRegistry[key] = {
              name: s.name,
              count: 0,
              severities: [],
              firstReported: chk.timestamp,
              lastReported: chk.timestamp,
              observationIds: [],
            };
          }
          const item = symptomRegistry[key];
          item.count++;
          if (s.severity) item.severities.push(s.severity);
          if (new Date(chk.timestamp) < new Date(item.firstReported)) item.firstReported = chk.timestamp;
          if (new Date(chk.timestamp) > new Date(item.lastReported)) item.lastReported = chk.timestamp;
        });
      }
    });
  }

  // Format summary frequency map for report
  const symptomFrequency = {};
  const symptomDetails = Object.values(symptomRegistry).map((s) => {
    symptomFrequency[s.name] = s.count;
    // Dominant severity
    const counts = s.severities.reduce((acc, curr) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {});
    const maxSev = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || 'mild';

    return {
      name: s.name,
      count: s.count,
      predominantSeverity: maxSev,
      firstReported: s.firstReported,
      lastReported: s.lastReported,
      observationIds: s.observationIds,
    };
  });

  return {
    symptomFrequency,
    symptomDetails,
    totalReportedSymptoms: symptomDetails.reduce((sum, s) => sum + s.count, 0),
    contributingObservationIds,
  };
}

export default calculateSymptomMetrics;
