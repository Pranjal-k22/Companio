import assert from 'assert';
import { Report } from '../../models/index.js';
import { AttestationService } from '../../services/reporting/attestationService.js';
import { ReportDataAggregator } from '../../services/reporting/reportDataAggregator.js';
import { ForbiddenError, NotFoundError } from '../../errors/AppError.js';

export async function runTestReportAuthorization({ orgAId, orgBId, patientAId, clinicianUserA }) {
  console.log('\n🧪 Testing Report Authorization & Tenant Isolation (testReportAuthorization.js)...');

  // 1. Cross-tenant aggregation check: Org B queries Patient A
  let crossTenantFailed = false;
  try {
    await ReportDataAggregator.aggregateReportData({
      patientId: patientAId,
      organizationId: orgBId, // Wrong organization!
      periodStart: new Date('2026-10-01'),
      periodEnd: new Date('2026-10-08'),
    });
  } catch (err) {
    crossTenantFailed = true;
    assert(err instanceof NotFoundError || err.message.includes('not found') || err.message.includes('organization'));
  }
  assert(crossTenantFailed, 'Cross-tenant aggregation query must be blocked');
  console.log('  ✔ [PASS] Tenant Isolation: Org B cannot aggregate data for Org A patient');

  // 2. Cross-tenant attestation check: Org B clinician attempts to attest to Org A report
  const orgAReport = await Report.create({
    patientId: patientAId,
    organizationId: orgAId,
    periodStart: new Date('2026-10-01'),
    periodEnd: new Date('2026-10-08'),
    overview: 'Org A sensitive overview',
    status: 'PENDING_REVIEW',
  });

  let crossTenantAttestFailed = false;
  try {
    await AttestationService.approveAndAttestReport({
      reportId: orgAReport._id,
      clinicianUser: clinicianUserA,
      tenant: { organizationId: orgBId.toString(), organizationObjectId: orgBId }, // Scoped to Org B
    });
  } catch (err) {
    crossTenantAttestFailed = true;
    assert(err instanceof ForbiddenError || err.message.includes('different organization'));
  }
  assert(crossTenantAttestFailed, 'Cross-tenant report attestation must be blocked');
  console.log('  ✔ [PASS] Tenant Isolation: Clinician under Org B cannot attest to Org A report');

  // Clean up
  await Report.deleteMany({ _id: orgAReport._id });
  return true;
}

export default runTestReportAuthorization;

