import { RiskNormalizer } from '../../services/safety/riskNormalizer.js';
import { ValidationError } from '../../errors/AppError.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✔ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

export async function runRiskNormalizerTests() {
  console.log('\n======================================================');
  console.log('🧪 Running Suite 3: Clinical Risk Signal Normalizer');
  console.log('======================================================');

  // 1. Normalizing Keyword Safety Net Signal
  const keywordSignal = RiskNormalizer.normalizeSignal({
    source: 'keyword_safety_net',
    category: 'chest_pain',
    severity: 'red',
    evidenceText: 'Patient said: crushing chest pain in my left arm',
    matchedPattern: 'crushing chest pain',
    ruleId: 'RULE_RED_CHEST_PAIN_V1',
    sessionContext: {
      patientId: '507f191e810c19729de860ea',
      organizationId: '507f191e810c19729de860eb',
      conversationId: '507f191e810c19729de860ec',
      turnId: 'turn-001',
    },
    contextAnalysis: {
      isHistorical: false,
      isThirdParty: false,
      classification: 'ACTIVE_CONCERN',
    },
  });

  assert(keywordSignal.category === 'chest_pain', 'Category normalized correctly');
  assert(keywordSignal.severity === 'red', 'Severity normalized to canonical red');
  assert(keywordSignal.sources.includes('keyword_safety_net'), 'Source recorded as keyword_safety_net');
  assert(keywordSignal.turnId === 'turn-001', 'Turn ID preserved');
  assert(keywordSignal.evidence.length === 1, 'Evidence array populated');
  assert(keywordSignal.evidence[0].matchedPattern === 'crushing chest pain', 'Matched pattern recorded in evidence');
  assert(keywordSignal.context.isCurrentSymptom === true, 'Current symptom context preserved');
  assert(keywordSignal.context.isPatientSubject === true, 'Patient subject context preserved');

  // 2. Normalizing LLM Tool Signal
  const llmSignal = RiskNormalizer.normalizeSignal({
    source: 'llm_tool',
    category: 'missed_dose_or_mild_side_effect',
    severity: 'yellow',
    evidenceText: 'Patient noted: forgot my blood pressure pill yesterday morning',
    sessionContext: {
      patientId: '507f191e810c19729de860ea',
      conversationId: '507f191e810c19729de860ec',
    },
  });

  assert(llmSignal.category === 'missed_dose_or_mild_side_effect', 'Sub-acute category normalized');
  assert(llmSignal.severity === 'yellow', 'Canonical severity is yellow');
  assert(llmSignal.sources.includes('llm_tool'), 'Source recorded as llm_tool');
  assert(llmSignal.requiresClinicianReview === true, 'Requires clinician review flag is true');

  // 3. Clinical Safety Invariant: Strict Canonical Taxonomy Enforcement
  // Attempting to downgrade a RED category like 'stroke_signs' to 'yellow' MUST be overridden
  const downgradeAttempt = RiskNormalizer.normalizeSignal({
    source: 'llm_tool',
    category: 'stroke_signs',
    severity: 'yellow', // Malicious or mistaken downgrade by LLM
    evidenceText: 'Patient reported slurred speech and facial numbness',
  });

  assert(
    downgradeAttempt.severity === 'red',
    'Safety net prevents downgrade of high-acuity taxonomy (stroke_signs strictly remains RED)'
  );

  // 4. Invalid Category Rejection
  let caughtInvalid = false;
  try {
    RiskNormalizer.normalizeSignal({
      source: 'llm_tool',
      category: 'alien_abduction_syndrome',
      severity: 'red',
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      caughtInvalid = true;
    }
  }
  assert(caughtInvalid, 'Rejects category outside approved clinical taxonomy with ValidationError');

  // 5. Missing Category Rejection
  let caughtMissing = false;
  try {
    RiskNormalizer.normalizeSignal({
      source: 'keyword_safety_net',
      severity: 'red',
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      caughtMissing = true;
    }
  }
  assert(caughtMissing, 'Rejects missing category with ValidationError');

  console.log(`\nSuite 3 Summary: ${passed} passed, ${failed} failed`);
  return { suite: 'RiskNormalizer', passed, failed };
}

// Allow standalone execution
if (process.argv[1]?.endsWith('testRiskNormalizer.js')) {
  runRiskNormalizerTests().then(({ passed, failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

export default runRiskNormalizerTests;
