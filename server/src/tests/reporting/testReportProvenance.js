import assert from 'assert';
import { ReportProvenanceService } from '../../services/reporting/reportProvenanceService.js';

export async function runTestReportProvenance() {
  console.log('\n🧪 Testing Report Provenance & Evidence Linkage (testReportProvenance.js)...');

  const reportPayload1 = {
    patientId: '507f1f77bcf86cd799439011',
    organizationId: '507f1f77bcf86cd799439012',
    version: 1,
    periodStart: new Date('2026-10-01'),
    periodEnd: new Date('2026-10-08'),
    overview: 'Clinical summary text for patient.',
    redFlags: [{ category: 'chest_pain', description: 'Pain reported', flagId: '507f1f77bcf86cd799439013' }],
    yellowFlags: [],
    positiveProgress: ['Good sleep'],
    trends: { adherencePct: 95 },
    patientConcerns: ['Knee discomfort'],
    followUp: ['Follow up in 1 week'],
  };

  // 1. Content Hash Verification
  const hash1 = ReportProvenanceService.computeReportContentHash(reportPayload1);
  assert(hash1 && hash1.length === 64, 'Content hash must be a 64-char hex string (SHA-256)');
  console.log('  ✔ [PASS] Report content SHA-256 hash computed successfully:', hash1.substring(0, 16) + '...');

  // 2. Tamper Detection: Changing a word in overview MUST change the hash
  const reportPayloadTampered = {
    ...reportPayload1,
    overview: 'Tampered summary text for patient.',
  };
  const hash2 = ReportProvenanceService.computeReportContentHash(reportPayloadTampered);
  assert.notStrictEqual(hash1, hash2, 'Hash must change when content is tampered');
  console.log('  ✔ [PASS] Tamper detection verified: altered content generates completely different hash');

  // 3. Evidence Graph Linkage
  const evidenceGraph = ReportProvenanceService.buildEvidenceGraph({
    narration: reportPayload1,
    clinicalMetrics: {
      deterministicMetrics: {
        medicationAdherence: { adherencePct: 95, contributingObservationIds: ['obs1', 'obs2'] },
        sleepMetrics: { sleepAvg: 7.5, contributingObservationIds: ['obs3'] },
      },
    },
    flagSummary: {
      activeRedFlags: [{ flagId: 'flag1', description: 'Pain reported' }],
      activeYellowFlags: [],
    },
  });

  assert(evidenceGraph.length >= 3, 'Evidence graph must contain claim-to-evidence links');
  assert(evidenceGraph.some((e) => e.sourceType === 'METRIC'));
  assert(evidenceGraph.some((e) => e.sourceType === 'FLAG'));
  assert(evidenceGraph.some((e) => e.sourceType === 'OBSERVATION'));
  console.log('  ✔ [PASS] Evidence graph correctly links claims to METRIC, FLAG, and OBSERVATION source IDs');

  return true;
}

export default runTestReportProvenance;
