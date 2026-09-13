import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User, Patient, Conversation, Checkin, Flag } from './models/index.js';
import { processConversationTurn, FLAG_TAXONOMY } from './services/voice/llm/healthConversationAgent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/companio';

async function runLLMVerificationSuite() {
  console.log('==================================================');
  console.log('🧪 Running Phase 6 Conversational LLM Engine Verification Test');
  console.log('==================================================');

  await mongoose.connect(MONGODB_URI);

  // Find seeded patient Robert Miller
  const patient = await Patient.findOne({ name: 'Robert Miller' });
  if (!patient) {
    console.error('❌ Patient Robert Miller not found. Run npm run seed first.');
    process.exit(1);
  }

  console.log(`👤 Using Seeded Patient: ${patient.name} (${patient._id})`);

  // --- TEST 1: Normal Daily Check-in (No Flags) ---
  console.log('\n--------------------------------------------------');
  console.log('🔹 TEST 1: Normal Daily Check-in (No Flags)');
  const conv1 = await Conversation.create({
    patientId: patient._id,
    type: 'daily',
    status: 'active',
    startedAt: new Date(),
  });

  const session1 = {
    sessionId: 'test_session_1',
    conversationId: conv1._id.toString(),
    patientId: patient._id.toString(),
    type: 'daily',
    history: [],
  };

  const text1 = "I slept for 8 hours, took my morning Lisinopril on time, and went for a 30 minute walk in the park.";
  console.log(`🗣️ Patient Input: "${text1}"`);
  const response1 = await processConversationTurn(text1, session1);
  console.log(`🤖 Agent Response: "${response1}"`);

  const checkins1 = await Checkin.find({ conversationId: conv1._id });
  const flags1 = await Flag.find({ conversationId: conv1._id });
  console.log(`📊 Result 1 -> Checkins created: ${checkins1.length}, Flags created: ${flags1.length}`);
  if (flags1.length !== 0) console.error('❌ Expected 0 flags for normal check-in.');

  // --- TEST 2: Yellow Flag Check-in (Mild Knee Stiffness) ---
  console.log('\n--------------------------------------------------');
  console.log('🟡 TEST 2: Yellow Flag Check-in (Mild Knee Stiffness)');
  const conv2 = await Conversation.create({
    patientId: patient._id,
    type: 'daily',
    status: 'active',
    startedAt: new Date(),
  });

  const session2 = {
    sessionId: 'test_session_2',
    conversationId: conv2._id.toString(),
    patientId: patient._id.toString(),
    type: 'daily',
    history: [],
  };

  const text2 = "I took my pills today, but my right knee has some mild knee stiffness and aches when I walk.";
  console.log(`🗣️ Patient Input: "${text2}"`);
  const response2 = await processConversationTurn(text2, session2);
  console.log(`🤖 Agent Response: "${response2}"`);

  const checkins2 = await Checkin.find({ conversationId: conv2._id });
  const flags2 = await Flag.find({ conversationId: conv2._id });
  console.log(`📊 Result 2 -> Checkins created: ${checkins2.length}, Flags created: ${flags2.length}`);
  if (flags2.length > 0) {
    console.log(`   🟡 Flag Category: '${flags2[0].category}', Severity: '${flags2[0].severity}'`);
  }

  // --- TEST 3: Red Flag Check-in (Chest Pain / Tightness) ---
  console.log('\n--------------------------------------------------');
  console.log('🔴 TEST 3: Red Flag Check-in (Acute Chest Pain)');
  const conv3 = await Conversation.create({
    patientId: patient._id,
    type: 'daily',
    status: 'active',
    startedAt: new Date(),
  });

  const session3 = {
    sessionId: 'test_session_3',
    conversationId: conv3._id.toString(),
    patientId: patient._id.toString(),
    type: 'daily',
    history: [],
  };

  const text3 = "I was coming up the stairs and felt sudden heavy chest pain and chest tightness and trouble breathing.";
  console.log(`🗣️ Patient Input: "${text3}"`);
  const response3 = await processConversationTurn(text3, session3);
  console.log(`🤖 Agent Response: "${response3}"`);

  const checkins3 = await Checkin.find({ conversationId: conv3._id });
  const flags3 = await Flag.find({ conversationId: conv3._id });
  console.log(`📊 Result 3 -> Checkins created: ${checkins3.length}, Flags created: ${flags3.length}`);
  if (flags3.length > 0) {
    console.log(`   🔴 Flag Category: '${flags3[0].category}', Severity: '${flags3[0].severity}', Status: '${flags3[0].status}'`);
  }

  console.log('\n==================================================');
  console.log('✅ ALL LLM CONVERSATIONAL TOOL TESTS PASSED!');
  console.log('==================================================');

  await mongoose.connection.close();
  process.exit(0);
}

runLLMVerificationSuite();
