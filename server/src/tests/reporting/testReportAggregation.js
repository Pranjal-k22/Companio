import assert from 'assert';
import mongoose from 'mongoose';
import { ReportDataAggregator } from '../../services/reporting/reportDataAggregator.js';
import { Patient, Observation, Checkin, Flag, Organization } from '../../models/index.js';

export async function runTestReportAggregation({ orgId, patientId }) {
  console.log('\n🧪 Testing Report Aggregation (testReportAggregation.js)...');

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 1. Create a valid observation and an invalid/rejected observation
  const validObs = await Observation.create({
    organizationId: orgId,
    patientId: patientId,
    observationCode: 'SLEEP_DURATION',
    observationCategory: 'sleep',
    observationDisplay: 'Sleep Duration (hrs)',
    valueType: 'quantity',
    valueQuantity: { value: 7.5, unit: 'hours' },
    status: 'VERIFIED',
    effectiveDateTime: new Date(),
    validationStatus: 'VALIDATED',
  });

  const rejectedObs = await Observation.create({
    organizationId: orgId,
    patientId: patientId,
    observationCode: 'SLEEP_DURATION',
    observationCategory: 'sleep',
    observationDisplay: 'Sleep Duration (hrs)',
    valueType: 'quantity',
    valueQuantity: { value: 35, unit: 'hours' }, // Impossible bounds
    status: 'PRELIMINARY',
    effectiveDateTime: new Date(),
    validationStatus: 'REJECTED',
  });

  const retractedObs = await Observation.create({
    organizationId: orgId,
    patientId: patientId,
    observationCode: 'FLUID_INTAKE',
    observationCategory: 'hydration',
    observationDisplay: 'Fluid Intake (mL)',
    valueType: 'quantity',
    valueQuantity: { value: 1000, unit: 'ml' },
    status: 'RETRACTED',
    effectiveDateTime: new Date(),
    validationStatus: 'VALIDATED',
  });

  // 2. Aggregate
  const aggregated = await ReportDataAggregator.aggregateReportData({
    patientId,
    organizationId: orgId,
    periodStart,
    periodEnd,
    reportType: 'WEEKLY_REPORT',
  });

  // Checks
  assert(aggregated.patient !== null, 'Aggregated patient should not be null');
  console.log('  ✔ [PASS] Aggregated patient record loaded successfully');

  const foundValid = aggregated.rawObservations.some((o) => o._id.toString() === validObs._id.toString());
  assert(foundValid, 'Valid observation must be included');
  console.log('  ✔ [PASS] Valid observation included in aggregation snapshot');

  const foundRejected = aggregated.rawObservations.some((o) => o._id.toString() === rejectedObs._id.toString());
  assert(!foundRejected, 'Rejected observation must be excluded');
  console.log('  ✔ [PASS] Invalid/rejected observation strictly excluded');

  const foundRetracted = aggregated.rawObservations.some((o) => o._id.toString() === retractedObs._id.toString());
  assert(!foundRetracted, 'Retracted observation must be excluded');
  console.log('  ✔ [PASS] Retracted observation strictly excluded');

  assert(aggregated.sourceSnapshot?.sourceVersionHash, 'Source version hash must be generated');
  console.log('  ✔ [PASS] Reproducible sourceVersionHash computed:', aggregated.sourceSnapshot.sourceVersionHash.substring(0, 16) + '...');

  // Clean up test documents
  await Observation.deleteMany({ _id: { $in: [validObs._id, rejectedObs._id, retractedObs._id] } });
  return true;
}

export default runTestReportAggregation;

