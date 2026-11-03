import {
  APPROVED_RED_TAXONOMY,
  APPROVED_YELLOW_TAXONOMY,
  APPROVED_CATEGORIES,
} from '../../models/SafetyRule.js';
import {
  safetyRuleRegistry,
  DEFAULT_SAFETY_RULES,
} from '../../services/safety/safetyRuleRegistry.js';
import { safetyRuleEngine } from '../../services/safety/safetyRuleEngine.js';

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

export async function runSafetyRuleEngineTests() {
  console.log('\n======================================================');
  console.log('🧪 Running Suite 1: Safety Rule Engine & Taxonomy');
  console.log('======================================================');

  // 1. Taxonomy Category Count Verification
  assert(
    APPROVED_RED_TAXONOMY.length === 13,
    `Approved RED taxonomy contains 13 categories (found: ${APPROVED_RED_TAXONOMY.length})`
  );
  assert(
    APPROVED_YELLOW_TAXONOMY.length === 10,
    `Approved YELLOW taxonomy contains 10 categories (found: ${APPROVED_YELLOW_TAXONOMY.length})`
  );

  const categories = safetyRuleRegistry.getApprovedCategories();
  assert(
    categories.RED.includes('chest_pain') &&
    categories.RED.includes('stroke_signs') &&
    categories.RED.includes('self_harm_ideation') &&
    categories.RED.includes('severe_allergic_reaction') &&
    categories.RED.includes('uncontrolled_bleeding'),
    'RED categories contain expected acute high-risk items'
  );

  assert(
    categories.YELLOW.includes('mild_new_symptom') &&
    categories.YELLOW.includes('missed_dose_or_mild_side_effect') &&
    categories.YELLOW.includes('sleep_disturbance') &&
    categories.YELLOW.includes('loneliness_isolation'),
    'YELLOW categories contain expected sub-acute items'
  );

  // 2. Registry Cache Initialization & Versioning
  const activeRules = safetyRuleRegistry.getActiveRules();
  assert(activeRules.length >= 23, `Rule registry pre-seeded with >=23 clinical rules (found: ${activeRules.length})`);

  const chestPainRule = activeRules.find((r) => r.category === 'chest_pain');
  assert(chestPainRule != null, 'Chest pain rule found in active rules');
  assert(chestPainRule.severity === 'red', 'Chest pain rule severity is red');
  assert(chestPainRule.ruleVersion === '1.0', 'Chest pain rule has governance version 1.0');
  assert(chestPainRule.status === 'ACTIVE', 'Chest pain rule status is ACTIVE');

  // 3. Rule Evaluation Engine Pattern Matching
  const matchesChestPain = safetyRuleEngine.evaluateText('Doctor, I am having sudden crushing chest pain in my left side');
  assert(matchesChestPain.length > 0, 'Evaluator matches acute chest pain utterance');
  assert(matchesChestPain[0].severity === 'red', 'Evaluated severity is red');
  assert(matchesChestPain[0].category === 'chest_pain', 'Evaluated category is chest_pain');
  assert(matchesChestPain[0].matchedPattern != null, 'Matched pattern is captured in result');

  const matchesYellowMed = safetyRuleEngine.evaluateText('I missed my dose of blood pressure pill this morning');
  assert(matchesYellowMed.length > 0, 'Evaluator matches missed dose utterance');
  assert(matchesYellowMed[0].severity === 'yellow', 'Evaluated severity is yellow');
  assert(matchesYellowMed[0].category === 'missed_dose_or_mild_side_effect', 'Evaluated category is missed_dose');

  const benignText = safetyRuleEngine.evaluateText('The weather was nice and I went for a 15 minute walk in the garden');
  assert(benignText.length === 0, 'Benign text returns 0 matches');

  // 4. Governance Rule Registration & Retirement
  const mockAdmin = { _id: '507f191e810c19729de860ea', role: 'ADMIN', name: 'Dr. Test' };
  const customRule = {
    ruleId: 'RULE_TEST_CUSTOM_001',
    ruleVersion: '1.0',
    description: 'Test Rule for Registration',
    severity: 'yellow',
    category: 'mild_new_symptom',
    approvedPatterns: [{ pattern: 'test custom symptom trigger' }],
    status: 'ACTIVE',
  };

  await safetyRuleRegistry.registerRule(customRule, mockAdmin);
  const activeAfterReg = safetyRuleRegistry.getActiveRules();
  assert(
    activeAfterReg.some((r) => r.ruleId === 'RULE_TEST_CUSTOM_001'),
    'Custom rule successfully registered and active in registry'
  );

  const matchCustom = safetyRuleEngine.evaluateText('Patient reported test custom symptom trigger today');
  assert(matchCustom.some((m) => m.ruleId === 'RULE_TEST_CUSTOM_001'), 'Engine evaluates newly registered rule');

  await safetyRuleRegistry.retireRule('RULE_TEST_CUSTOM_001', mockAdmin);
  const activeAfterRetire = safetyRuleRegistry.getActiveRules();
  assert(
    !activeAfterRetire.some((r) => r.ruleId === 'RULE_TEST_CUSTOM_001'),
    'Custom rule successfully retired and removed from active rules'
  );

  console.log(`\nSuite 1 Summary: ${passed} passed, ${failed} failed`);
  return { suite: 'SafetyRuleEngine', passed, failed };
}

// Allow standalone execution
if (process.argv[1]?.endsWith('testSafetyRuleEngine.js')) {
  runSafetyRuleEngineTests().then(({ passed, failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

export default runSafetyRuleEngineTests;
