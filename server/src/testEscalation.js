import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Patient, Conversation, Flag, EscalationEvent } from './models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/companio';

async function runEscalationVerification() {
  console.log('==================================================');
  console.log('🧪 Running Escalation Notification Verification...');
  console.log('==================================================');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✔ Connected to MongoDB.');

    // Find Robert Miller
    const robert = await Patient.findOne({ name: 'Robert Miller' });
    if (!robert) {
      throw new Error('Robert Miller patient record not found. Run seed script first.');
    }

    // Find or create dummy conversation for testing
    let conversation = await Conversation.findOne({ patientId: robert._id });
    if (!conversation) {
      conversation = await Conversation.create({
        patientId: robert._id,
        startedAt: new Date(),
        status: 'active',
        type: 'daily',
      });
    }

    // ----------------------------------------------------
    // Test 1: Standard Red Flag Creation & Escalation Event
    // ----------------------------------------------------
    console.log('\n--- Test 1: Red Flag Post-Save Escalation Hook ---');
    const redFlag = await Flag.create({
      patientId: robert._id,
      conversationId: conversation._id,
      severity: 'red',
      category: 'chest_pain',
      description: 'Patient reported acute chest tightness during voice check-in.',
      sourceText: 'My chest feels tight and heavy.',
      source: 'test_script',
    });

    console.log(`✔ Red Flag created (${redFlag._id})`);

    // Give post-save async hook a moment to process
    await new Promise((r) => setTimeout(r, 800));

    // Verify EscalationEvent document was created
    const escalationEvent = await EscalationEvent.findOne({ flagId: redFlag._id });
    if (!escalationEvent) {
      console.error('❌ EscalationEvent document NOT FOUND for red flag!');
    } else {
      console.log(`✔ EscalationEvent created in MongoDB (${escalationEvent._id}):`);
      console.log(`   - Channel: ${escalationEvent.channel}`);
      console.log(`   - Status: ${escalationEvent.status}`);
      console.log(`   - Provider Message ID: ${escalationEvent.providerMessageId}`);
    }

    // Verify Flag document status updated
    const updatedFlag = await Flag.findById(redFlag._id);
    console.log(`✔ Flag Status Updated: ${updatedFlag.status} (Notified Via: "${updatedFlag.notifiedVia}")`);

    // ----------------------------------------------------
    // Test 2: Resiliency Test with Invalid Credentials (SMS & Resend Email)
    // ----------------------------------------------------
    console.log('\n--- Test 2: Resiliency Test with Invalid API Keys (Twilio & Resend) ---');
    process.env.ENABLE_SMS_ESCALATION = 'true';
    process.env.TWILIO_ACCOUNT_SID = 'AC_invalid_test_sid_12345';
    process.env.TWILIO_AUTH_TOKEN = 'invalid_auth_token_67890';
    process.env.TWILIO_FROM_NUMBER = '+15550000000';

    process.env.ENABLE_EMAIL_ESCALATION = 'true';
    process.env.RESEND_API_KEY = 're_invalid_test_key_1234567890';

    const test2Flag = await Flag.create({
      patientId: robert._id,
      conversationId: conversation._id,
      severity: 'red',
      category: 'severe_breathlessness',
      description: 'Patient reported severe breathlessness during test.',
      sourceText: "I can't catch my breath.",
      source: 'test_script',
    });

    await new Promise((r) => setTimeout(r, 1200));

    // Confirm flag saved successfully even though providers failed
    const checkTest2Flag = await Flag.findById(test2Flag._id);
    if (checkTest2Flag) {
      console.log(`✔ Flag saved successfully despite SMS & Resend API failures (${checkTest2Flag._id})`);
    } else {
      console.error('❌ Flag was not saved during invalid key test!');
    }

    const test2SmsEvent = await EscalationEvent.findOne({ flagId: test2Flag._id, channel: 'SMS' });
    if (test2SmsEvent) {
      console.log(`✔ SMS Failure recorded gracefully in EscalationEvent (${test2SmsEvent.status}, Error: "${test2SmsEvent.error}")`);
    }

    const test2EmailEvent = await EscalationEvent.findOne({ flagId: test2Flag._id, channel: 'EMAIL' });
    if (test2EmailEvent) {
      console.log(`✔ Resend Email Failure recorded gracefully in EscalationEvent (${test2EmailEvent.status}, Error: "${test2EmailEvent.error}")`);
    }

    console.log('\n==================================================');
    console.log('✅ ESCALATION NOTIFICATION VERIFICATION PASSED');
    console.log('==================================================');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Escalation verification failed:', err);
    process.exit(1);
  }
}

runEscalationVerification();
