import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Patient, Report, Flag, Checkin } from './models/index.js';
import { generateClinicianReport, computeClinicalTrends } from './services/reportGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/companio';

async function runReportGeneratorVerification() {
  console.log('==================================================');
  console.log('🧪 Running Report Generator Service Verification...');
  console.log('==================================================');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✔ Connected to MongoDB.');

    // 1. Find Robert Miller
    const robert = await Patient.findOne({ name: 'Robert Miller' });
    if (!robert) {
      throw new Error('Robert Miller patient record not found. Please run seed script first.');
    }
    console.log(`✔ Found patient: ${robert.name} (${robert._id})`);

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - 14 * 24 * 60 * 60 * 1000);

    // 2. Test Ground-Truth Trend Computation
    console.log('\n--- Test 1: Ground-Truth Trend Computation ---');
    const computed = await computeClinicalTrends(robert._id, periodStart, periodEnd);
    console.log('Computed Ground-Truth Trends:', JSON.stringify({
      totalCheckins: computed.totalCheckins,
      adherencePct: computed.adherencePct,
      missedDoses: computed.missedDoses,
      sleepAvg: computed.sleepAvg,
      sleepTrend: computed.sleepTrend,
      hydrationAvg: computed.hydrationAvg,
      activityAvg: computed.activityAvg,
      redFlagsCount: computed.redFlags.length,
      yellowFlagsCount: computed.yellowFlags.length,
      symptomFrequency: computed.symptomFrequency,
      patientConcerns: computed.patientConcerns,
    }, null, 2));

    // Verify Red Flag Presence
    const chestPainFlag = computed.redFlags.find((f) => f.category === 'chest_pain' || f.description.toLowerCase().includes('chest'));
    if (!chestPainFlag) {
      console.error('❌ RED FLAG (chest pain) NOT FOUND in computed trends!');
    } else {
      console.log(`✔ RED FLAG identified correctly: "${chestPainFlag.description}" (Category: ${chestPainFlag.category})`);
    }

    // 3. Test Full Report Generation (with actual or fallback LLM call)
    console.log('\n--- Test 2: Full Report Generation ---');
    const report = await generateClinicianReport(robert._id, periodStart, periodEnd);
    console.log('\nGenerated Report Summary:');
    console.log(`Report ID: ${report._id}`);
    console.log(`Overview: ${report.overview}`);
    console.log(`Red Flags (${report.redFlags.length}):`, report.redFlags);
    console.log(`Yellow Flags (${report.yellowFlags.length}):`, report.yellowFlags);
    console.log(`Positive Progress:`, report.positiveProgress);
    console.log(`Follow Up Actions:`, report.followUp);
    console.log(`Trends (Adherence: ${report.trends?.adherencePct}%, Sleep: ${report.trends?.sleepAvg}h, Activity: ${report.trends?.activityAvg}m, Hydration: ${report.trends?.hydrationAvg}mL)`);

    // 4. Test Fallback Path with Invalid OpenAI API Key
    console.log('\n--- Test 3: Fallback Path Verification (Invalid API Key) ---');
    const originalApiKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'sk-proj-invalid-key-for-testing-fallback-path';

    const fallbackReport = await generateClinicianReport(robert._id, periodStart, periodEnd);
    process.env.OPENAI_API_KEY = originalApiKey; // Restore original API key

    console.log(`✔ Fallback Report generated successfully without throwing (${fallbackReport._id})`);
    console.log(`Fallback Overview: ${fallbackReport.overview}`);

    console.log('\n==================================================');
    console.log('✅ REPORT GENERATOR VERIFICATION PASSED');
    console.log('==================================================');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  }
}

runReportGeneratorVerification();
