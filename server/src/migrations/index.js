import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { runMigration as runMigration001, verifyMigration } from './001_phase2_multi_tenancy.js';
import { up as runMigration002 } from './002_phase3_consent_privacy.js';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isVerify = args.includes('--verify');
  const isExecute = args.includes('--execute') || (!isDryRun && !isVerify);

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/companio';
  console.log(`[Migration CLI] Connecting to MongoDB: ${mongoUri.replace(/:([^:@]{4})[^:@]*@/, ':****@')}`);
  await mongoose.connect(mongoUri);

  try {
    if (isVerify) {
      console.log('\n--- VERIFYING MULTI-TENANCY DATA COMPLIANCE ---');
      const verification = await verifyMigration();
      console.table(verification.results);
      if (verification.allClean) {
        console.log('✅ All tenant records possess valid organizationId references.');
      } else {
        console.warn('⚠️ Some records are still missing organizationId.');
      }
    } else {
      console.log(`\n--- RUNNING MIGRATION 001: MULTI-TENANCY (${isDryRun ? 'DRY-RUN' : 'LIVE EXECUTION'}) ---`);
      const result001 = await runMigration001({ dryRun: isDryRun });
      console.log('\n--- MIGRATION 001 SUMMARY ---');
      console.log(JSON.stringify(result001, null, 2));

      console.log(`\n--- RUNNING MIGRATION 002: CONSENT & PRIVACY BASELINE (${isDryRun ? 'DRY-RUN' : 'LIVE EXECUTION'}) ---`);
      const result002 = await runMigration002({ dryRun: isDryRun });
      console.log('\n--- MIGRATION 002 SUMMARY ---');
      console.log(JSON.stringify(result002, null, 2));

      // Post-migration verification
      if (!isDryRun) {
        const verification = await verifyMigration();
        console.log('\n--- POST-MIGRATION VERIFICATION ---');
        console.table(verification.results);
      }
    }
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('[Migration CLI] Disconnected from database.');
  }
}

if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  main();
}

export { runMigration001, runMigration002, verifyMigration };

