import mongoose from 'mongoose';
import { ensureDbConnected, closeDbConnection } from './testDbHelper.js';
import { Flag } from '../../models/Flag.js';
import { FlagDeduplicator } from '../../services/safety/flagDeduplicator.js';
import { RiskNormalizer } from '../../services/safety/riskNormalizer.js';

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

export async function runFlagDeduplicationTests() {
  console.log('\n======================================================');
  console.log('🧪 Running Suite 4: Atomic Flag Deduplication & Merging');
  console.log('======================================================');

  await ensureDbConnected();

  const testConversationId = new mongoose.Types.ObjectId();
  const testPatientId = new mongoose.Types.ObjectId();
  const testOrgId = new mongoose.Types.ObjectId();

  try {
    // 1. Initial Signal from Keyword Safety Net
    const rawSignal1 = {
      source: 'keyword_safety_net',
      category: 'chest_pain',
      severity: 'red',
      evidenceText: 'Patient said: I have crushing chest pain',
      matchedPattern: 'crushing chest pain',
      ruleId: 'RULE_RED_CHEST_PAIN_V1',
      sessionContext: {
        patientId: testPatientId,
        organizationId: testOrgId,
        conversationId: testConversationId,
        turnId: 'turn-1',
      },
    };

    const normSignal1 = RiskNormalizer.normalizeSignal(rawSignal1);
    const result1 = await FlagDeduplicator.deduplicateAndPersist(normSignal1);

    assert(result1.isNew === true, 'First signal creates a new Flag document (isNew: true)');
    assert(result1.isMerged === false, 'First signal is not marked merged');
    assert(result1.flag != null, 'Flag record is persisted to DB');
    assert(result1.flag.category === 'chest_pain', 'Flag category matches');
    assert(result1.flag.severity === 'red', 'RED flag initial status is escalated');
    assert(result1.flag.status === 'escalated', 'Flag status defaults to escalated for RED');
    assert(result1.flag.sources.includes('keyword_safety_net'), 'Source recorded as keyword_safety_net');

    // 2. Duplicate Signal from LLM Tool in Same Turn / Conversation
    const rawSignal2 = {
      source: 'llm_tool',
      category: 'chest_pain',
      severity: 'red',
      evidenceText: 'Clinician assistant noted patient reported cardiac pain in chest',
      sessionContext: {
        patientId: testPatientId,
        organizationId: testOrgId,
        conversationId: testConversationId,
        turnId: 'turn-1',
      },
    };

    const normSignal2 = RiskNormalizer.normalizeSignal(rawSignal2);
    const result2 = await FlagDeduplicator.deduplicateAndPersist(normSignal2);

    assert(result2.isNew === false, 'Duplicate signal in same conversation does not insert new flag');
    assert(result2.isMerged === true, 'Duplicate signal is atomically merged (isMerged: true)');
    assert(
      result2.flag.sources.includes('keyword_safety_net') &&
      result2.flag.sources.includes('llm_tool'),
      'Merged flag contains combined sources [keyword_safety_net, llm_tool]'
    );
    assert(result2.flag.evidence.length >= 2, 'Evidence from both sources is preserved');

    // 3. Verify Only One Document Exists in DB for this Conversation + Category
    const dbFlags = await Flag.find({
      conversationId: testConversationId,
      category: 'chest_pain',
    });
    assert(dbFlags.length === 1, `Exactly 1 Flag exists in MongoDB after duplicate ingestion (found: ${dbFlags.length})`);

    // 4. Non-Active Mentions (Negated / Historical) Skip Flag Persistence
    const negatedSignal = RiskNormalizer.normalizeSignal({
      source: 'keyword_safety_net',
      category: 'stroke_signs',
      severity: 'red',
      evidenceText: 'Patient denied stroke symptoms',
      sessionContext: {
        patientId: testPatientId,
        conversationId: testConversationId,
      },
      contextAnalysis: {
        classification: 'NEGATED',
        reason: 'Matched negation cue "denied"',
      },
    });

    const negatedResult = await FlagDeduplicator.deduplicateAndPersist(negatedSignal);
    assert(negatedResult.flag === null, 'Negated signal returns null flag (not persisted)');
    assert(negatedResult.skippedReason === 'NEGATED', 'Skipped reason records NEGATED');

    const checkNegatedInDb = await Flag.findOne({
      conversationId: testConversationId,
      category: 'stroke_signs',
    });
    assert(checkNegatedInDb === null, 'No Flag created in MongoDB for negated mention');
  } finally {
    // Cleanup test flags
    await Flag.deleteMany({ conversationId: testConversationId });
  }

  console.log(`\nSuite 4 Summary: ${passed} passed, ${failed} failed`);
  return { suite: 'FlagDeduplication', passed, failed };
}

// Allow standalone execution
if (process.argv[1]?.endsWith('testFlagDeduplication.js')) {
  runFlagDeduplicationTests()
    .then(({ passed, failed }) => {
      closeDbConnection().then(() => process.exit(failed > 0 ? 1 : 0));
    })
    .catch((err) => {
      console.error(err);
      closeDbConnection().then(() => process.exit(1));
    });
}

export default runFlagDeduplicationTests;
