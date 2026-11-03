import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { runWeeklyReportBatch } from './jobs/weeklyReportWorker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/companio';

async function testWorker() {
  console.log('🧪 Testing Weekly Report Cron Worker Service...');
  await mongoose.connect(MONGODB_URI);

  const summary = await runWeeklyReportBatch();
  console.log('📊 Worker Summary Output:', summary);

  if (summary.totalProcessed > 0 && summary.succeeded > 0) {
    console.log('✅ Weekly Report Worker verification passed successfully!');
  } else {
    console.error('❌ Weekly Report Worker failed to process patients.');
    process.exit(1);
  }

  await mongoose.connection.close();
  process.exit(0);
}

testWorker();

