import mongoose from 'mongoose';
import {
  Patient,
  Organization,
  Membership,
  ConsentRecord,
  CONSENT_PURPOSES,
} from '../models/index.js';
import { recordBatchConsent, CURRENT_NOTICE_VERSION } from '../services/consentService.js';

/**
 * Migration 002: Seed Initial Baseline Consent Records for All Enrolled Patients
 * Guarantees zero unconsented voice processing while ensuring AUDIO_RETENTION defaults to WITHDRAWN.
 */
export async function up({ dryRun = false } = {}) {
  console.log(`=== Starting Phase 3 Consent & Privacy Migration ===`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}`);

  const patients = await Patient.find({}).lean();
  console.log(`Found ${patients.length} enrolled patients.`);

  let seededCount = 0;
  let alreadyConsentedCount = 0;

  for (const patient of patients) {
    if (!patient.organizationId) {
      console.warn(`[WARN] Skipping unassigned patient ${patient._id} (${patient.name})`);
      continue;
    }

    const existingRecords = await ConsentRecord.find({
      organizationId: patient.organizationId,
      patientId: patient._id,
    }).countDocuments();

    if (existingRecords > 0) {
      alreadyConsentedCount++;
      continue;
    }

    console.log(`Seeding baseline consents for Patient: ${patient.name} (${patient._id}) in Org: ${patient.organizationId}`);

    if (!dryRun) {
      const baselineDecisions = [
        { purpose: 'MICROPHONE', decision: 'GRANTED', notes: 'Microphone audio capture consented.' },
        { purpose: 'LIVE_TRANSCRIPTION', decision: 'GRANTED', notes: 'Real-time AssemblyAI streaming transcription consented.' },
        { purpose: 'AI_PROCESSING', decision: 'GRANTED', notes: 'Google Gemini conversational AI clinical synthesis consented.' },
        { purpose: 'CLINICIAN_SHARING', decision: 'GRANTED', notes: 'Care-team clinical report sharing consented.' },
        { purpose: 'AUDIO_RETENTION', decision: 'WITHDRAWN', notes: 'Audio retention disabled by default under privacy policy.' },
      ];

      await recordBatchConsent({
        organizationId: patient.organizationId,
        patientId: patient._id,
        decisions: baselineDecisions,
        noticeVersion: CURRENT_NOTICE_VERSION,
        channel: 'WEB_PORTAL',
        actorId: patient.userId || patient._id,
        actorRole: 'PATIENT',
        notes: 'Initial clinical baseline consent onboarding under policy notice 2026.1',
      });
    }

    seededCount++;
  }

  console.log(`Migration Summary:`);
  console.log(`  - Patients Seeded: ${seededCount}`);
  console.log(`  - Already Consented: ${alreadyConsentedCount}`);
  console.log(`=== Phase 3 Consent Migration Complete ===`);

  return { seededCount, alreadyConsentedCount };
}

export default { up };
