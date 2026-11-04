/**
 * Weight Metrics Calculator
 * Computes deterministic weight trends while enforcing strict unit compatibility.
 * Weight is critical in heart failure monitoring (fluid retention indicator).
 */
export function calculateWeightMetrics(aggregatedData) {
  const { rawObservations = [], rawCheckins = [], patient } = aggregatedData;

  const weightMeasurements = [];
  const contributingObservationIds = [];

  // 1. Process atomic observations
  const weightObs = rawObservations.filter((o) => o.observationCode === 'BODY_WEIGHT');

  weightObs.forEach((obs) => {
    contributingObservationIds.push(obs._id.toString());
    if (obs.valueType === 'missing' || obs.missingReason) return;

    const val = obs.valueQuantity?.value;
    const unit = (obs.valueQuantity?.unit || 'lbs').toLowerCase();

    if (typeof val === 'number' && !isNaN(val) && val > 0) {
      weightMeasurements.push({
        date: obs.effectiveDateTime,
        value: val,
        unit: unit.includes('kg') ? 'kg' : 'lbs',
        sourceId: obs._id.toString(),
      });
    }
  });

  // 2. Fall back to checkins if no atomic observations
  if (weightObs.length === 0 && rawCheckins.length > 0) {
    rawCheckins.forEach((chk) => {
      if (typeof chk.weight === 'number' && !isNaN(chk.weight) && chk.weight > 0) {
        weightMeasurements.push({
          date: chk.timestamp,
          value: chk.weight,
          unit: 'lbs', // default legacy
          sourceId: chk._id.toString(),
        });
      }
    });
  }

  // 3. Fall back to patient baseline if no period measurements
  if (weightMeasurements.length === 0 && patient?.baselineMetrics?.weight) {
    weightMeasurements.push({
      date: 'Baseline',
      value: patient.baselineMetrics.weight,
      unit: 'lbs',
      sourceId: 'PATIENT_BASELINE',
    });
  }

  // Determine direction of change where comparable
  let weightChange = null;
  let unit = weightMeasurements[0]?.unit || 'lbs';
  let direction = 'stable';

  if (weightMeasurements.length >= 2) {
    const first = weightMeasurements[0];
    const last = weightMeasurements[weightMeasurements.length - 1];

    if (first.unit === last.unit) {
      weightChange = parseFloat((last.value - first.value).toFixed(1));
      if (weightChange >= 2.0) direction = 'increasing';
      else if (weightChange <= -2.0) direction = 'decreasing';
      else direction = 'stable';
    } else {
      direction = 'incompatible_units';
    }
  }

  return {
    measurements: weightMeasurements,
    latestWeight: weightMeasurements.length > 0 ? weightMeasurements[weightMeasurements.length - 1].value : null,
    unit,
    weightChange,
    direction,
    contributingObservationIds,
  };
}

export default calculateWeightMetrics;
