/**
 * Medication Adherence Metric Calculator
 * Computes deterministic adherence statistics from observations and check-ins.
 * Enforces strict denominator rules: unknown/declined doses are never coerced to missed or taken.
 */
export function calculateMedicationAdherence(aggregatedData) {
  const { rawObservations = [], rawCheckins = [], previousReport } = aggregatedData;

  let expectedDoses = 0;
  let takenDoses = 0;
  let missedDoses = 0;
  let unknownDoses = 0;
  let declinedDoses = 0;
  const contributingObservationIds = [];
  const sideEffectsReported = new Set();
  const notesList = [];

  // 1. Process atomic observations first (highest clinical fidelity)
  const medObs = rawObservations.filter((o) => o.observationCategory === 'medication');

  medObs.forEach((obs) => {
    contributingObservationIds.push(obs._id.toString());
    expectedDoses++;

    if (obs.valueType === 'missing' || obs.missingReason) {
      if (obs.missingReason === 'DECLINED') {
        declinedDoses++;
      } else {
        unknownDoses++;
      }
    } else if (obs.valueBoolean === true || obs.valueQuantity?.value === 1) {
      takenDoses++;
    } else if (obs.valueBoolean === false || obs.valueQuantity?.value === 0) {
      missedDoses++;
    } else if (obs.valueString) {
      const lower = obs.valueString.toLowerCase();
      if (lower.includes('take') || lower.includes('yes') || lower.includes('all')) {
        takenDoses++;
      } else if (lower.includes('miss') || lower.includes('no') || lower.includes('forgot')) {
        missedDoses++;
      } else {
        unknownDoses++;
      }
    } else {
      unknownDoses++;
    }
  });

  // 2. If no atomic observations exist, inspect legacy checkin records (prevent double-counting)
  if (medObs.length === 0 && rawCheckins.length > 0) {
    rawCheckins.forEach((chk) => {
      if (chk.adherence) {
        const missed = Number(chk.adherence.missedDoses) || 0;
        const taken = chk.adherence.taken === false ? 0 : 1;
        takenDoses += taken;
        missedDoses += missed;
        expectedDoses += taken + missed;

        if (Array.isArray(chk.adherence.sideEffectsReported)) {
          chk.adherence.sideEffectsReported.forEach((se) => sideEffectsReported.add(se));
        }
        if (chk.adherence.notes) {
          notesList.push(chk.adherence.notes);
        }
      }
    });
  }

  // Defensible denominator: only doses with known outcomes (taken + missed)
  const knownDoses = takenDoses + missedDoses;
  let adherencePct = null;
  let calculationStatus = 'INSUFFICIENT_DATA';

  if (knownDoses > 0) {
    adherencePct = Math.round((takenDoses / knownDoses) * 100);
    calculationStatus = (unknownDoses > 0 || declinedDoses > 0) ? 'PARTIAL' : 'COMPLETE';
  } else if (expectedDoses === 0) {
    calculationStatus = 'NOT_APPLICABLE';
  }

  // Comparison with previous period
  const prevAdherence = previousReport?.trends?.adherencePct ?? previousReport?.deterministicMetrics?.medicationAdherence?.adherencePct ?? null;
  let comparisonTrend = 'stable';
  if (adherencePct !== null && prevAdherence !== null) {
    if (adherencePct - prevAdherence >= 5) comparisonTrend = 'improving';
    else if (prevAdherence - adherencePct >= 5) comparisonTrend = 'declining';
  }

  return {
    expectedDoses,
    takenDoses,
    missedDoses,
    unknownDoses,
    declinedDoses,
    knownDoses,
    adherencePct,
    sideEffects: Array.from(sideEffectsReported),
    notes: notesList.slice(0, 5),
    calculationStatus,
    comparisonTrend,
    previousAdherencePct: prevAdherence,
    contributingObservationIds,
  };
}

export default calculateMedicationAdherence;
