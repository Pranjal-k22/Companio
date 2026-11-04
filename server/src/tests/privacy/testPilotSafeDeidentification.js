/**
 * Companio Phase 12.2: Pilot-Safe De-Identification & Zero-PHI Architecture Test Suite
 *
 * Validates that the safe alternative architecture is actively implemented and tested in code:
 * 1. HIPAA Safe Harbor direct identifier scrubbing (Names, Phones, Emails, SSNs, MRNs, Dates, Zip codes)
 * 2. Demographic age bracket generalization (5-year brackets, no exact birth dates)
 * 3. Tokenized, zero-PHI SMS alert formatting for Twilio
 * 4. Tokenized, zero-PHI Email alert formatting for Resend
 * 5. Dynamic Zero-PHI mode environment activation and dispatch verification
 */

import assert from 'assert';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import {
  deidentifyText,
  deidentifyPatientProfile,
  createZeroPhiNotificationPayload,
  isZeroPhiModeEnabled,
} from '../../services/privacy/deidentificationService.js';

export async function runTestPilotSafeDeidentification() {
  console.log('\n========================================================================');
  console.log('🔒 COMPANIO PHASE 12.2: PILOT-SAFE DE-IDENTIFICATION SUITE');
  console.log('========================================================================');

  let passedChecks = 0;

  // ---------------------------------------------------------------------------
  // Check 1: Direct Patient Name Redaction
  // ---------------------------------------------------------------------------
  console.log('\n--- 1. Testing Direct Patient Name Scrubbing ---');
  const clinicalText = 'Patient Arthur Pendelton visited today and Arthur reported knee pain.';
  const scrubbedName = deidentifyText(clinicalText, { patientName: 'Arthur Pendelton' });
  assert(!scrubbedName.includes('Arthur'), 'Patient first name MUST be redacted');
  assert(!scrubbedName.includes('Pendelton'), 'Patient last name MUST be redacted');
  assert(scrubbedName.includes('[PATIENT_NAME]'), 'Redacted tokens must be present');
  console.log('  ✔ [PASS] Patient name successfully scrubbed: ' + scrubbedName);
  passedChecks++;

  // ---------------------------------------------------------------------------
  // Check 2: Email Address Redaction
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Testing Email Address Scrubbing ---');
  const emailText = 'Contact daughter at claire.pendelton@familycare.org for update.';
  const scrubbedEmail = deidentifyText(emailText);
  assert(!scrubbedEmail.includes('claire.pendelton@familycare.org'), 'Email must be scrubbed');
  assert(scrubbedEmail.includes('[REDACTED_EMAIL]'), 'Email token must be present');
  console.log('  ✔ [PASS] Email address successfully scrubbed: ' + scrubbedEmail);
  passedChecks++;

  // ---------------------------------------------------------------------------
  // Check 3: Phone Number Redaction
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Testing Phone Number Scrubbing ---');
  const phoneText = 'Call patient at +1 (555) 234-5678 or secondary 555-876-5432.';
  const scrubbedPhone = deidentifyText(phoneText);
  assert(!scrubbedPhone.includes('234-5678'), 'Primary phone must be scrubbed');
  assert(!scrubbedPhone.includes('876-5432'), 'Secondary phone must be scrubbed');
  assert(scrubbedPhone.includes('[REDACTED_PHONE]'), 'Phone token must be present');
  console.log('  ✔ [PASS] Phone numbers successfully scrubbed: ' + scrubbedPhone);
  passedChecks++;

  // ---------------------------------------------------------------------------
  // Check 4: Social Security Number Redaction
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Testing Social Security Number (SSN) Scrubbing ---');
  const ssnText = 'Patient record associated with SSN 123-45-6789 verified.';
  const scrubbedSsn = deidentifyText(ssnText);
  assert(!scrubbedSsn.includes('123-45-6789'), 'SSN must be scrubbed');
  assert(scrubbedSsn.includes('[REDACTED_SSN]'), 'SSN token must be present');
  console.log('  ✔ [PASS] SSN successfully scrubbed: ' + scrubbedSsn);
  passedChecks++;

  // ---------------------------------------------------------------------------
  // Check 5: Medical Record Number (MRN) Redaction
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Testing Medical Record Number (MRN) Scrubbing ---');
  const mrnText = 'Admitted under MRN: 9876543210 for chest observation.';
  const scrubbedMrn = deidentifyText(mrnText);
  assert(!scrubbedMrn.includes('9876543210'), 'MRN must be scrubbed');
  assert(scrubbedMrn.includes('[REDACTED_MRN]'), 'MRN token must be present');
  console.log('  ✔ [PASS] MRN successfully scrubbed: ' + scrubbedMrn);
  passedChecks++;

  // ---------------------------------------------------------------------------
  // Check 6: Calendar Date Redaction
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Testing Calendar Date Scrubbing ---');
  const dateText = 'Episode began on 10/14/2026 and followed up on October 20, 2026.';
  const scrubbedDate = deidentifyText(dateText);
  assert(!scrubbedDate.includes('10/14/2026'), 'Date slash format must be scrubbed');
  assert(!scrubbedDate.includes('October 20, 2026'), 'Date textual format must be scrubbed');
  assert(scrubbedDate.includes('[REDACTED_DATE]'), 'Date token must be present');
  console.log('  ✔ [PASS] Calendar dates successfully scrubbed: ' + scrubbedDate);
  passedChecks++;

  // ---------------------------------------------------------------------------
  // Check 7: US Postal Zip Code Redaction
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Testing Zip Code Scrubbing ---');
  const zipText = 'Patient residing in zip code 90210-1234 near clinic.';
  const scrubbedZip = deidentifyText(zipText);
  assert(!scrubbedZip.includes('90210-1234'), 'Zip code must be scrubbed');
  assert(scrubbedZip.includes('[REDACTED_ZIP]'), 'Zip token must be present');
  console.log('  ✔ [PASS] Zip codes successfully scrubbed: ' + scrubbedZip);
  passedChecks++;

  // ---------------------------------------------------------------------------
  // Check 8: Patient Demographic Profile De-Identification
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. Testing Demographic Profile De-Identification ---');
  const mockPatient = {
    _id: new mongoose.Types.ObjectId('6aeb02cafdee8216471e11a1'),
    name: 'Arthur Pendelton',
    age: 74,
    gender: 'male',
    chronicConditions: ['Hypertension', 'Osteoarthritis'],
    emergencyContacts: [{ name: 'Claire', phoneNumber: '555-019-2834' }],
  };

  const deidProfile = deidentifyPatientProfile(mockPatient);
  assert.strictEqual(deidProfile.name, undefined, 'Name must NOT exist in de-identified profile');
  assert.strictEqual(deidProfile.emergencyContacts, undefined, 'Contacts must NOT exist in profile');
  assert.strictEqual(deidProfile.ageBracket, '[AGE_70_74]', 'Age must be bracketed into 5-year cohort');
  assert.strictEqual(deidProfile.gender, 'male');
  assert.strictEqual(deidProfile.chronicConditions.length, 2);
  console.log('  ✔ [PASS] Profile generalized to bracket [AGE_70_74] with zero direct contact identifiers');
  passedChecks++;

  // ---------------------------------------------------------------------------
  // Check 9: Tokenized Zero-PHI SMS Alert Formatting (Twilio Safe Mode)
  // ---------------------------------------------------------------------------
  console.log('\n--- 9. Testing Tokenized Zero-PHI SMS Payload (Twilio Safe Mode) ---');
  const mockEventDoc = {
    _id: new mongoose.Types.ObjectId('6aeb049085d977675c5f3aba'),
    tier: 1,
  };
  const mockFlag = {
    category: 'chest_pain',
    description: 'Crushing chest tightness radiating to jaw',
    sourceText: 'heavy pressure in my chest',
  };

  const smsPayload = createZeroPhiNotificationPayload({
    eventDoc: mockEventDoc,
    flag: mockFlag,
    patient: mockPatient,
    detailUrl: 'https://staging.companio.health/alerts/6aeb049085d977675c5f3aba',
    channel: 'SMS',
  });

  assert(smsPayload.isZeroPhi === true, 'Payload must be flagged as Zero-PHI');
  assert(!smsPayload.body.includes('Arthur'), 'SMS MUST NOT contain patient name');
  assert(!smsPayload.body.includes('chest_pain'), 'SMS MUST NOT contain medical category');
  assert(!smsPayload.body.includes('pressure in my chest'), 'SMS MUST NOT contain transcript quote');
  assert(smsPayload.body.includes('Tier 1') || smsPayload.body.includes('TIER 1'), 'SMS must indicate priority tier');
  assert(smsPayload.body.includes('Authenticate to review'), 'SMS must direct to authenticated portal');
  console.log('  ✔ [PASS] Zero-PHI SMS payload verified: ' + smsPayload.body.replace(/\n/g, ' '));
  passedChecks++;

  // ---------------------------------------------------------------------------
  // Check 10: Tokenized Zero-PHI Email Alert Formatting (Resend Safe Mode)
  // ---------------------------------------------------------------------------
  console.log('\n--- 10. Testing Tokenized Zero-PHI Email Payload (Resend Safe Mode) ---');
  const emailPayload = createZeroPhiNotificationPayload({
    eventDoc: mockEventDoc,
    flag: mockFlag,
    patient: mockPatient,
    detailUrl: 'https://staging.companio.health/alerts/6aeb049085d977675c5f3aba',
    channel: 'EMAIL',
  });

  assert(emailPayload.isZeroPhi === true, 'Email payload must be flagged as Zero-PHI');
  assert(!emailPayload.subject.includes('Arthur'), 'Email subject MUST NOT contain patient name');
  assert(!emailPayload.subject.includes('chest_pain'), 'Email subject MUST NOT contain medical condition');
  assert(!emailPayload.html.includes('Arthur Pendelton'), 'Email HTML body MUST NOT contain patient name');
  assert(!emailPayload.html.includes('heavy pressure in my chest'), 'Email HTML body MUST NOT contain quote');
  assert(emailPayload.html.includes('Patient name and health data are withheld'), 'Email must state HIPAA zero-PHI rationale');
  console.log('  ✔ [PASS] Zero-PHI Email payload verified (Clean subject: ' + emailPayload.subject + ')');
  passedChecks++;

  // ---------------------------------------------------------------------------
  // Check 11: Dynamic Activation via Environment Flag
  // ---------------------------------------------------------------------------
  console.log('\n--- 11. Testing Zero-PHI Activation Engine ---');
  const prevZeroPhi = process.env.ZERO_PHI_MODE;
  try {
    process.env.ZERO_PHI_MODE = 'true';
    assert.strictEqual(isZeroPhiModeEnabled(), true, 'Must return true when ZERO_PHI_MODE=true');

    process.env.ZERO_PHI_MODE = 'false';
    process.env.ZERO_PHI_NOTIFICATIONS = 'true';
    assert.strictEqual(isZeroPhiModeEnabled(), true, 'Must return true when ZERO_PHI_NOTIFICATIONS=true');

    process.env.ZERO_PHI_NOTIFICATIONS = 'false';
    assert.strictEqual(isZeroPhiModeEnabled(), false, 'Must return false when flags are false');
    console.log('  ✔ [PASS] Dynamic environment activation engine verified.');
    passedChecks++;
  } finally {
    process.env.ZERO_PHI_MODE = prevZeroPhi;
  }

  // ---------------------------------------------------------------------------
  // Check 12: Comprehensive 18-Identifier Scrubbing on Synthetic Clinical Note
  // ---------------------------------------------------------------------------
  console.log('\n--- 12. Testing Comprehensive Combined Clinical Narrative Scrubbing ---');
  const complexNarrative = `
    Patient: Arthur Pendelton, DOB: 05/12/1952, SSN: 987-65-4321, MRN: MRN84729104.
    Residence: 104 Main St, Austin, TX 78701. Phone: (512) 555-9012.
    Email: arthur.pendelton@example.com.
    Clinical Note: On November 02, 2026, Arthur reported acute chest pressure.
  `;

  const scrubbedNarrative = deidentifyText(complexNarrative, { patientName: 'Arthur Pendelton' });
  assert(!scrubbedNarrative.includes('Arthur'), 'Arthur must not appear');
  assert(!scrubbedNarrative.includes('Pendelton'), 'Pendelton must not appear');
  assert(!scrubbedNarrative.includes('05/12/1952'), 'Birthdate must not appear');
  assert(!scrubbedNarrative.includes('987-65-4321'), 'SSN must not appear');
  assert(!scrubbedNarrative.includes('MRN84729104'), 'MRN must not appear');
  assert(!scrubbedNarrative.includes('78701'), 'Zip code must not appear');
  assert(!scrubbedNarrative.includes('555-9012'), 'Phone must not appear');
  assert(!scrubbedNarrative.includes('arthur.pendelton@example.com'), 'Email must not appear');
  assert(!scrubbedNarrative.includes('November 02, 2026'), 'Date must not appear');
  console.log('  ✔ [PASS] All 9 embedded direct identifiers successfully neutralized.');
  passedChecks++;

  console.log('\n========================================================================');
  console.log(`🏁 PILOT-SAFE DE-IDENTIFICATION SUITE: ${passedChecks} / 12 CHECKS PASSED (100%)`);
  console.log('========================================================================\n');

  return { success: true, passedChecks };
}

// Direct CLI invocation
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runTestPilotSafeDeidentification()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ De-identification suite failed:', err);
      process.exit(1);
    });
}
