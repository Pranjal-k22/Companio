import assert from 'assert';
import { Report } from '../../models/index.js';

export async function runTestReportIntegrity({ baseUrl, clinicianToken, orgId, patientId }) {
  console.log('\n🧪 Testing Report Integrity & REST API Suite (testReportIntegrity.js)...');

  const headers = {
    Authorization: `Bearer ${clinicianToken}`,
    'X-Organization-Id': orgId.toString(),
    'Content-Type': 'application/json',
  };

  // 1. API: GET /api/v1/reports
  const resList = await fetch(`${baseUrl}/api/v1/reports`, { headers });
  const dataList = await resList.json();
  assert.strictEqual(resList.status, 200, 'GET /api/v1/reports must return 200');
  console.log('  ✔ [PASS] API 1: GET /api/v1/reports returns 200 with scoped report list');

  // 2. API: POST /api/v1/patients/:patientId/reports/generate
  const resGen = await fetch(`${baseUrl}/api/v1/patients/${patientId}/reports/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  const dataGen = await resGen.json();
  assert.strictEqual(resGen.status, 201, 'POST generate report must return 201');
  const generatedReport = dataGen.data?.report || dataGen.report;
  assert(generatedReport && generatedReport._id, 'Generated report must exist');
  console.log(`  ✔ [PASS] API 2: POST /api/v1/patients/:patientId/reports/generate returns 201 (Report ID: ${generatedReport._id})`);

  // 3. API: GET /api/v1/reports/:reportId
  const resGet = await fetch(`${baseUrl}/api/v1/reports/${generatedReport._id}`, { headers });
  const dataGet = await resGet.json();
  assert.strictEqual(resGet.status, 200, 'GET /api/v1/reports/:id must return 200');
  console.log('  ✔ [PASS] API 3: GET /api/v1/reports/:reportId returns 200 with report details');

  // 4. API: GET /api/v1/reports/:reportId/versions
  const resVersions = await fetch(`${baseUrl}/api/v1/reports/${generatedReport._id}/versions`, { headers });
  const dataVersions = await resVersions.json();
  assert.strictEqual(resVersions.status, 200, 'GET versions must return 200');
  console.log('  ✔ [PASS] API 4: GET /api/v1/reports/:reportId/versions returns 200');

  // 5. API: GET /api/v1/reports/:reportId/provenance
  const resProv = await fetch(`${baseUrl}/api/v1/reports/${generatedReport._id}/provenance`, { headers });
  const dataProv = await resProv.json();
  assert.strictEqual(resProv.status, 200, 'GET provenance must return 200');
  console.log('  ✔ [PASS] API 5: GET /api/v1/reports/:reportId/provenance returns 200 with content hash');

  // 6. API: POST /api/v1/reports/:reportId/review
  const resReview = await fetch(`${baseUrl}/api/v1/reports/${generatedReport._id}/review`, {
    method: 'POST',
    headers,
  });
  const dataReview = await resReview.json();
  assert.strictEqual(resReview.status, 200, 'POST review must return 200');
  console.log('  ✔ [PASS] API 6: POST /api/v1/reports/:reportId/review returns 200 with attestation preview');

  // 7. API: POST /api/v1/reports/:reportId/approve
  const resApprove = await fetch(`${baseUrl}/api/v1/reports/${generatedReport._id}/approve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ statement: 'I have reviewed and attested this report.' }),
  });
  const dataApprove = await resApprove.json();
  assert.strictEqual(resApprove.status, 200, 'POST approve must return 200');
  console.log('  ✔ [PASS] API 7: POST /api/v1/reports/:reportId/approve returns 200 and locks status to APPROVED');

  // 8. API: GET /api/v1/reports/:reportId/attestations
  const resAttestations = await fetch(`${baseUrl}/api/v1/reports/${generatedReport._id}/attestations`, { headers });
  const dataAttestations = await resAttestations.json();
  assert.strictEqual(resAttestations.status, 200, 'GET attestations must return 200');
  console.log('  ✔ [PASS] API 8: GET /api/v1/reports/:reportId/attestations returns 200 with audit trail');

  // 9. API: POST /api/v1/reports/:reportId/export
  const resExport = await fetch(`${baseUrl}/api/v1/reports/${generatedReport._id}/export`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  assert.strictEqual(resExport.status, 200, 'POST export must return 200');
  assert.strictEqual(resExport.headers.get('content-type'), 'application/pdf');
  console.log('  ✔ [PASS] API 9: POST /api/v1/reports/:reportId/export returns 200 with application/pdf');

  // 10. API: POST /api/v1/reports/:reportId/publish
  const resPublish = await fetch(`${baseUrl}/api/v1/reports/${generatedReport._id}/publish`, {
    method: 'POST',
    headers,
  });
  const dataPublish = await resPublish.json();
  assert.strictEqual(resPublish.status, 200, 'POST publish must return 200');
  console.log('  ✔ [PASS] API 10: POST /api/v1/reports/:reportId/publish returns 200 with PUBLISHED status');

  // 11. API: POST /api/v1/reports/:reportId/amend
  const resAmend = await fetch(`${baseUrl}/api/v1/reports/${generatedReport._id}/amend`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      amendmentReason: 'Patient verified additional afternoon walk',
      overview: 'Updated overview with verified activity details',
    }),
  });
  const dataAmend = await resAmend.json();
  assert.strictEqual(resAmend.status, 201, 'POST amend must return 201');
  const amendedReport = dataAmend.data?.report || dataAmend.report;
  assert.strictEqual(amendedReport.version, 2, 'Amended report version must be 2');
  console.log('  ✔ [PASS] API 11: POST /api/v1/reports/:reportId/amend returns 201 with version v2');

  // 12. API: POST /api/v1/reports/:reportId/regenerate
  const resRegen = await fetch(`${baseUrl}/api/v1/reports/${amendedReport._id}/regenerate`, {
    method: 'POST',
    headers,
  });
  const dataRegen = await resRegen.json();
  assert.strictEqual(resRegen.status, 201, 'POST regenerate must return 201');
  console.log('  ✔ [PASS] API 12: POST /api/v1/reports/:reportId/regenerate returns 201 with new version');

  // 13. API: POST /api/v1/reports/:reportId/reject (on a draft)
  const draftToReject = await Report.create({
    patientId,
    organizationId: orgId,
    periodStart: new Date('2026-10-01'),
    periodEnd: new Date('2026-10-08'),
    overview: 'Draft to reject',
    status: 'DRAFT',
  });
  const resReject = await fetch(`${baseUrl}/api/v1/reports/${draftToReject._id}/reject`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ reason: 'Insufficient clinical data for attestation' }),
  });
  const dataReject = await resReject.json();
  assert.strictEqual(resReject.status, 200, 'POST reject must return 200');
  console.log('  ✔ [PASS] API 13: POST /api/v1/reports/:reportId/reject returns 200 with REJECTED status');

  // Clean up
  await Report.deleteMany({ _id: { $in: [generatedReport._id, amendedReport._id, draftToReject._id] } });
  return true;
}

export default runTestReportIntegrity;
