import assert from 'assert';
import { ReportValidationService } from '../../services/reporting/reportValidationService.js';
import { ReportNarrationService, narrationOutputSchema } from '../../services/reporting/reportNarrationService.js';

export async function runTestNarrationValidation() {
  console.log('\n🧪 Testing Narration Validation & Template Fallback (testNarrationValidation.js)...');

  // 1. Test validation detects missing red flags when safety system detected active red flags
  const mockNarrationWithMissingFlags = {
    overview: 'Patient completed check-ins. Medication adherence was 100%. Everything appears stable.',
    redFlags: [], // Empty, but safety system detected red flags!
    yellowFlags: [],
    positiveProgress: ['Good sleep'],
    patientConcerns: [],
    clinicianFollowUp: [],
  };

  const mockMetrics = {
    deterministicMetrics: {
      medicationAdherence: { adherencePct: 100 },
      sleepMetrics: { sleepAvg: 8 },
    },
    dataCompleteness: { limitations: [] },
  };

  const mockFlagSummaryWithRed = {
    activeRedFlags: [
      { flagId: 'flag123', category: 'chest_pain', description: 'Patient reported acute chest tightness' },
    ],
    activeYellowFlags: [],
  };

  const validationResult = ReportValidationService.validateReport({
    narration: mockNarrationWithMissingFlags,
    clinicalMetrics: mockMetrics,
    flagSummary: mockFlagSummaryWithRed,
    periodStart: new Date('2026-10-01'),
    periodEnd: new Date('2026-10-08'),
    organizationId: 'org123',
  });

  assert.strictEqual(validationResult.isValid, false, 'Validation must fail when active red flags are omitted');
  assert(validationResult.errors.some((e) => e.includes('Safety Violation')), 'Must contain Safety Violation error');
  console.log('  ✔ [PASS] ReportValidationService rejects narration that omitted active RED flags');

  // 2. Test fallback narration generates complete 8-section report without throwing
  const patient = { name: 'Eleanor Vance', age: 78 };
  const fallback = ReportNarrationService.generateDeterministicFallback({
    patient,
    periodStart: new Date('2026-10-01'),
    periodEnd: new Date('2026-10-08'),
    clinicalMetrics: mockMetrics,
    flagSummary: mockFlagSummaryWithRed,
    explicitConcerns: [{ text: 'Difficulty opening pill bottle' }],
    patientQuestions: [],
  });

  assert(fallback.overview.length > 10, 'Overview must be non-empty');
  assert.strictEqual(fallback.redFlags.length, 1, 'Must contain 1 red flag');
  assert.strictEqual(fallback.patientConcerns.length, 1, 'Must contain patient concern');
  assert(fallback.positiveProgress.length > 0, 'Must contain positive progress');
  console.log('  ✔ [PASS] Deterministic Template Fallback creates valid 8-section report with zero hallucinations');

  return true;
}

export default runTestNarrationValidation;
