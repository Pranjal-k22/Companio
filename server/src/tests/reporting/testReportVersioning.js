import assert from 'assert';
import { ReportVersionService } from '../../services/reporting/reportVersionService.js';
import { Report } from '../../models/index.js';

export async function runTestReportVersioning({ orgId, patientId }) {
  console.log('\n🧪 Testing Report Versioning & Staleness (testReportVersioning.js)...');

  const periodStart = new Date('2026-10-01');
  const periodEnd = new Date('2026-10-08');

  // 1. Create Initial Draft (v1)
  const reportData = {
    patientId,
    organizationId: orgId,
    periodStart,
    periodEnd,
    overview: 'Initial v1 overview text',
    redFlags: [],
    yellowFlags: [],
    positiveProgress: ['Stable vitals'],
    trends: { adherencePct: 100 },
    patientConcerns: [],
    followUp: [],
    status: 'DRAFT',
    sourceSnapshot: {
      sourceVersionHash: 'hash_snapshot_test_123',
      observationIds: [],
      checkinIds: [],
      flagIds: [],
    },
  };

  const v1Report = await ReportVersionService.createOrVersionReport({ reportData });
  assert.strictEqual(v1Report.version, 1, 'Initial report version must be 1');
  console.log('  ✔ [PASS] Initial Report version v1 created successfully');

  // 2. Idempotency Check: Calling create again with same snapshot hash returns existing draft
  const duplicateDraft = await ReportVersionService.createOrVersionReport({ reportData });
  assert.strictEqual(duplicateDraft._id.toString(), v1Report._id.toString(), 'Idempotency must return identical document');
  console.log('  ✔ [PASS] Idempotency: duplicate request returns existing draft without creating duplicate document');

  // 3. Versioning on Amendment (creates v2)
  const v2ReportData = {
    ...reportData,
    overview: 'Amended v2 overview text with clinician notes',
    sourceSnapshot: { sourceVersionHash: 'hash_snapshot_test_456' },
  };

  const v2Report = await ReportVersionService.createOrVersionReport({
    reportData: v2ReportData,
    existingReportId: v1Report._id,
    amendmentReason: 'Clinician amended overview details',
  });

  assert.strictEqual(v2Report.version, 2, 'Amended report version must increment to 2');
  assert.strictEqual(v2Report.supersedesReportId.toString(), v1Report._id.toString(), 'v2 must link to superseded v1');

  // Verify v1 status was updated to SUPERSEDED
  const updatedV1 = await Report.findById(v1Report._id);
  assert.strictEqual(updatedV1.status, 'SUPERSEDED', 'Superseded report status must be updated');
  console.log('  ✔ [PASS] Non-destructive amendment: v1 preserved with SUPERSEDED status, v2 created linked via supersedesReportId');

  // Clean up test reports
  await Report.deleteMany({ _id: { $in: [v1Report._id, v2Report._id] } });
  return true;
}

export default runTestReportVersioning;

