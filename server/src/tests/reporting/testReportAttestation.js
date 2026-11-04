import assert from 'assert';
import { AttestationService } from '../../services/reporting/attestationService.js';
import { Report, ReportAttestation, User } from '../../models/index.js';
import { ForbiddenError, BadRequestError } from '../../errors/AppError.js';

export async function runTestReportAttestation({ orgId, patientId, clinicianUser }) {
  console.log('\n🧪 Testing Clinician Attestation & Immutability (testReportAttestation.js)...');

  // 1. Create a draft report
  const draftReport = await Report.create({
    patientId,
    organizationId: orgId,
    periodStart: new Date('2026-10-01'),
    periodEnd: new Date('2026-10-08'),
    overview: 'Draft clinical overview for attestation test',
    redFlags: [],
    yellowFlags: [],
    positiveProgress: ['Adherence verified'],
    trends: { adherencePct: 95 },
    status: 'PENDING_REVIEW',
    version: 1,
  });

  // 2. Attestation Preview
  const preview = await AttestationService.getAttestationPreview({
    reportId: draftReport._id,
    clinicianUser,
    tenant: { organizationId: orgId.toString() },
  });
  assert(preview.attestationStatement.includes('I have reviewed this report'), 'Preview must include explicit attestation statement');
  assert(preview.reportContentHash, 'Preview must compute content hash');
  console.log('  ✔ [PASS] Attestation Preview returns explicit legal statement and content hash');

  // 3. Approve and Attest Report
  const { report: approvedReport, attestation } = await AttestationService.approveAndAttestReport({
    reportId: draftReport._id,
    clinicianUser,
    tenant: { organizationId: orgId.toString(), organizationObjectId: orgId },
  });

  assert.strictEqual(approvedReport.status, 'APPROVED', 'Report status must transition to APPROVED');
  assert.strictEqual(attestation.reportVersion, 1, 'Attestation version must match report version');
  assert.strictEqual(attestation.clinicianUserId.toString(), clinicianUser._id.toString());
  console.log('  ✔ [PASS] Clinician successfully approved and attested to report version v1');

  // 4. Immutability Enforcement: Attempting to approve an already approved report MUST fail
  let immutabilityFailed = false;
  try {
    await AttestationService.approveAndAttestReport({
      reportId: draftReport._id,
      clinicianUser,
      tenant: { organizationId: orgId.toString(), organizationObjectId: orgId },
    });
  } catch (err) {
    immutabilityFailed = true;
    assert(err instanceof BadRequestError || err.message.includes('already approved'));
  }
  assert(immutabilityFailed, 'Approving an already approved report must be rejected');
  console.log('  ✔ [PASS] Immutability enforced: Approved reports cannot be re-approved without amendment');

  // 5. Unauthorized User Check: Non-clinicians (e.g. PATIENT role) cannot attest
  let unauthorizedFailed = false;
  const fakePatientUser = { _id: '507f1f77bcf86cd799439099', name: 'John Doe', role: 'PATIENT' };
  try {
    await AttestationService.approveAndAttestReport({
      reportId: draftReport._id,
      clinicianUser: fakePatientUser,
      tenant: { organizationId: orgId.toString(), organizationObjectId: orgId },
    });
  } catch (err) {
    unauthorizedFailed = true;
    assert(err instanceof ForbiddenError || err.message.includes('authorized'));
  }
  assert(unauthorizedFailed, 'Patient role must be rejected from attesting');
  console.log('  ✔ [PASS] Role-based security: Non-clinicians strictly prevented from attesting');

  // Clean up test documents
  await Report.deleteMany({ _id: draftReport._id });
  await ReportAttestation.deleteMany({ _id: attestation._id });
  return true;
}

export default runTestReportAttestation;

