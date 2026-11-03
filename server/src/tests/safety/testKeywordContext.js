import {
  segmentIntoClauses,
  isNegated,
  isHistorical,
  isThirdParty,
  isHypothetical,
  hasCorrection,
  analyzeClinicalContext,
} from '../../services/safety/contextAnalyzer.js';
import { keywordSafetyNet } from '../../services/safety/keywordSafetyNet.js';

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

export async function runKeywordContextTests() {
  console.log('\n======================================================');
  console.log('🧪 Running Suite 2: Clinical Keyword Context Analysis');
  console.log('======================================================');

  // 1. Multi-Clause Segmentation & Boundary Isolation
  const multiClauseText = 'I had no headache today, but I have severe chest pain right now';
  const clauses = segmentIntoClauses(multiClauseText);
  assert(clauses.length >= 2, `Multi-clause sentence segmented into >= 2 clauses (found: ${clauses.length})`);
  assert(
    clauses[0].toLowerCase().includes('no headache'),
    'Clause 1 contains first symptom'
  );
  assert(
    clauses[1].toLowerCase().includes('chest pain'),
    'Clause 2 contains emergency symptom'
  );

  // Verify clause 1 is negated but clause 2 is NOT negated
  const clause1Analysis = analyzeClinicalContext(clauses[0], 'headache');
  const clause2Analysis = analyzeClinicalContext(clauses[1], 'chest pain');
  assert(clause1Analysis.isNegated === true, 'Clause 1 (headache) is correctly marked negated');
  assert(clause2Analysis.isNegated === false, 'Clause 2 (chest pain) is NOT negated across boundary');

  // 2. Direct Negation Detection
  assert(isNegated('I do not have any chest pain', 'chest pain'), 'Detects "do not have" negation');
  assert(isNegated('I have no shortness of breath whatsoever', 'shortness of breath'), 'Detects "no [symptom]" negation');
  assert(isNegated('Patient denies suicidal thoughts', 'suicidal thoughts'), 'Detects clinical "denies" negation');
  assert(isNegated('Without any dizziness today', 'dizziness'), 'Detects "without any" negation');
  assert(!isNegated('I have terrible crushing chest pain', 'chest pain'), 'Positive symptom is NOT negated');

  // 3. Temporal Context (Historical vs Acute)
  assert(isHistorical('I had chest pain 5 years ago, none recently', 'chest pain'), 'Detects historical context ("5 years ago")');
  assert(!isHistorical('Chest pain started 15 minutes ago suddenly', 'chest pain'), 'Acute context is not historical');

  // 4. Third-Party Attribution
  assert(isThirdParty('My brother had a stroke last year', 'stroke'), 'Detects third-party family attribution ("my brother")');
  assert(isThirdParty('My neighbor fell down the stairs', 'fell'), 'Detects third-party attribution ("my neighbor")');
  assert(!isThirdParty('I fell in the kitchen and hurt my hip', 'fell'), 'Detects patient self-report ("I fell")');

  // 5. Hypothetical Statements
  assert(
    isHypothetical('What should someone do if they have crushing chest pain?', 'chest pain'),
    'Detects hypothetical question ("what should someone do if")'
  );
  assert(
    !isHypothetical('I have crushing chest pain right now', 'chest pain'),
    'Acute complaint is not hypothetical'
  );

  // 6. Transcript Self-Correction
  assert(
    hasCorrection('The transcription is wrong. I said I have no pain.', 'pain'),
    'Detects transcript self-correction ("the transcription is wrong")'
  );

  // 7. End-to-End KeywordSafetyNet Pipeline with Context
  const safetyNetNegated = await keywordSafetyNet.evaluateUtterance('I do not have any chest pain today');
  assert(
    !safetyNetNegated.hasConcerns || safetyNetNegated.concerns.length === 0,
    'KeywordSafetyNet suppresses negated chest pain utterance'
  );

  const safetyNetThirdParty = await keywordSafetyNet.evaluateUtterance('My sister had severe chest pain yesterday');
  assert(
    !safetyNetThirdParty.hasConcerns || safetyNetThirdParty.concerns.length === 0,
    'KeywordSafetyNet suppresses third-party family symptom'
  );

  const safetyNetMultiClause = await keywordSafetyNet.evaluateUtterance(
    'I had no dizziness earlier, but I have severe chest pain right now'
  );
  assert(
    safetyNetMultiClause.hasConcerns === true,
    'KeywordSafetyNet catches acute chest pain in adversative second clause'
  );
  assert(
    safetyNetMultiClause.concerns.some((c) => c.severity === 'red' && c.category === 'chest_pain'),
    'Preserves RED chest pain flag despite prior clause negation'
  );

  console.log(`\nSuite 2 Summary: ${passed} passed, ${failed} failed`);
  return { suite: 'KeywordContext', passed, failed };
}

// Allow standalone execution
if (process.argv[1]?.endsWith('testKeywordContext.js')) {
  runKeywordContextTests().then(({ passed, failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

export default runKeywordContextTests;
