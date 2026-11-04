import assert from 'assert';
import mongoose from 'mongoose';
import { Patient, Report, Organization } from '../../models/index.js';
import { processReportGenerationJob } from '../../jobs/workers/reportGenerationWorker.js';

export async function testReportGenerationQueue() {
  console.log('\n🧪 Testing Report Generation Queue & Attestation Gate (testReportGenerationQueue.js)...');

  const orgId = new mongoose.Types.ObjectId();
  const patientId = new mongoose.Types.ObjectId();
  const clinicianId = new mongoose.Types.ObjectId();

  // Create patient in MongoDB
  const patient = await Patient.create({
    _id: patientId,
    name: 'Eleanor Vance (Queue Test)',
    age: 78,
    gender: 'female',
    organizationId: orgId,
    assignedClinicianId: clinicianId,
  });

  const periodEnd = new Date();
  const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const mockJob = {
    id: `report-job-${patientId}`,
    data: {
      patientId: patient._id,
      organizationId: orgId,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      correlationId: 'test-report-queue-corrid',
    },
    attemptsMade: 0,
    opts: { attempts: 3 },
  };

  const outcome = await processReportGenerationJob(mockJob);
  assert.ok(outcome.success, 'Report worker must complete successfully');
  assert.ok(outcome.reportId, 'Report ID must be returned');
  console.log(`  ✔ [PASS] Report generation worker completed job (Report ID: ${outcome.reportId})`);

  // Verify Report Document in MongoDB
  const reportDoc = await Report.findById(outcome.reportId);
  assert.ok(reportDoc, 'Report document must exist in MongoDB');

  // CRITICAL CLINICAL SAFETY INVARIANT:
  // Must be strictly PENDING_REVIEW; NEVER automatically APPROVED or PUBLISHED!
  assert.strictEqual(
    reportDoc.status,
    'PENDING_REVIEW',
    "CRITICAL: Background worker generated reports must be in 'PENDING_REVIEW' status"
  );
  assert.strictEqual(reportDoc.version, 1, 'Initial generated version must be 1');
  assert.ok(reportDoc.contentHash, 'Report must compute SHA-256 contentHash');
  console.log("  ✔ [PASS] CRITICAL CLINICAL INVARIANT VERIFIED: Report created in 'PENDING_REVIEW' status awaiting clinician attestation");
}

export default testReportGenerationQueue;
