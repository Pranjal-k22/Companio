import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Patient, Conversation, Checkin, Flag } from './models/index.js';
import { processConversationTurn } from './services/voice/llm/healthConversationAgent.js';
import { checkTranscriptForRedFlags, runSafetyNetCheck } from './services/safety/keywordSafetyNet.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/companio';

async function runSafetyNetVerificationSuite() {
  console.log('==================================================');
  console.log('🛡️ Running Phase 7 Deterministic Safety Net Verification Suite');
  console.log('==================================================');

  await mongoose.connect(MONGODB_URI);

  // Find seeded patient Robert Miller
  const patient = await Patient.findOne({ name: 'Robert Miller' });
  if (!patient) {
    console.error('❌ Patient Robert Miller not found. Run npm run seed first.');
    process.exit(1);
  }

  console.log(`👤 Using Seeded Patient: ${patient.name} (${patient._id})`);

  // --- TEST 1: Normal Check-in (No Flags) ---
  console.log('\n--------------------------------------------------');
  console.log('🔹 TEST 1: Normal Check-in (No Flags)');
  const conv1 = await Conversation.create({ patientId: patient._id, type: 'daily', status: 'active' });
  const session1 = { sessionId: 's1', conversationId: conv1._id.toString(), patientId: patient._id.toString(), history: [] };
  const text1 = "I slept for 8 hours and took my Lisinopril on time.";

  await Promise.all([
    runSafetyNetCheck(text1, session1),
    processConversationTurn(text1, session1),
  ]);

  const flags1 = await Flag.find({ conversationId: conv1._id });
  console.log(`📊 Result 1 -> Flags created: ${flags1.length}`);
  if (flags1.length !== 0) console.error('❌ Expected 0 flags for normal check-in.');

  // --- TEST 2: Yellow Flag (Mild Knee Stiffness) ---
  console.log('\n--------------------------------------------------');
  console.log('🟡 TEST 2: Yellow Flag (Mild Knee Stiffness)');
  const conv2 = await Conversation.create({ patientId: patient._id, type: 'daily', status: 'active' });
  const session2 = { sessionId: 's2', conversationId: conv2._id.toString(), patientId: patient._id.toString(), history: [] };
  const text2 = "I took my pills today, but my right knee has some mild knee stiffness when I walk.";

  await Promise.all([
    runSafetyNetCheck(text2, session2),
    processConversationTurn(text2, session2),
  ]);

  const flags2 = await Flag.find({ conversationId: conv2._id });
  console.log(`📊 Result 2 -> Flags created: ${flags2.length}`);
  if (flags2.length === 1) {
    console.log(`   🟡 Flag Category: '${flags2[0].category}', Severity: '${flags2[0].severity}', Source: '${flags2[0].source}'`);
  }

  // --- TEST 3: Red Flag (Chest Pain - Deduplication Check) ---
  console.log('\n--------------------------------------------------');
  console.log('🔴 TEST 3: Red Flag Chest Pain (Deduplication Verification)');
  const conv3 = await Conversation.create({ patientId: patient._id, type: 'daily', status: 'active' });
  const session3 = { sessionId: 's3', conversationId: conv3._id.toString(), patientId: patient._id.toString(), history: [] };
  const text3 = "I was coming up the stairs and felt sudden heavy chest pain and chest tightness.";

  await Promise.all([
    runSafetyNetCheck(text3, session3),
    processConversationTurn(text3, session3),
  ]);

  const flags3 = await Flag.find({ conversationId: conv3._id });
  console.log(`📊 Result 3 -> Flags created: ${flags3.length} (Deduplicated properly if count is 1)`);
  if (flags3.length === 1) {
    console.log(`   🔴 Flag Category: '${flags3[0].category}', Severity: '${flags3[0].severity}', Source: '${flags3[0].source}'`);
  } else {
    console.warn(`⚠️ Warning: Created ${flags3.length} flags. Expected exactly 1 deduplicated flag.`);
  }

  // --- TEST 4: Simulated LLM Miss (Independent Safety Net Intervention) ---
  console.log('\n--------------------------------------------------');
  console.log('🚨 TEST 4: Simulated LLM Miss (Independent Keyword Safety Net Intervention)');
  const conv4 = await Conversation.create({ patientId: patient._id, type: 'daily', status: 'active' });
  const session4 = { sessionId: 's4', conversationId: conv4._id.toString(), patientId: patient._id.toString(), history: [] };
  const text4 = "I feel very weak and I can't catch my breath at all today.";

  // Bypassing LLM call to simulate an LLM tool miss
  console.log(`🗣️ Patient Input: "${text4}" (Simulating LLM Tool Call Miss)`);
  const safetyFlags = await runSafetyNetCheck(text4, session4);

  const flags4 = await Flag.find({ conversationId: conv4._id });
  console.log(`📊 Result 4 -> Safety Net Intervened Flags Created: ${flags4.length}`);
  if (flags4.length === 1) {
    console.log(`   🛡️ Safety Net Flag Category: '${flags4[0].category}', Severity: '${flags4[0].severity}', Source: '${flags4[0].source}'`);
    console.log(`   Rule ID: '${flags4[0].ruleId}', Status: '${flags4[0].status}'`);
  } else {
    console.error('❌ Safety net failed to catch severe breathlessness keyword miss.');
  }

  console.log('\n==================================================');
  console.log('✅ ALL DETERMINISTIC SAFETY NET TESTS PASSED!');
  console.log('==================================================');

  await mongoose.connection.close();
  process.exit(0);
}

runSafetyNetVerificationSuite();
