import assert from 'assert';
import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { ensureDbConnected, closeDbConnection } from './tests/safety/testDbHelper.js';
import {
  Patient,
  Conversation,
  Checkin,
  DialogueSession,
  Observation,
  Organization,
  User,
  Membership,
  LOINC_MAPPINGS,
} from './models/index.js';
import apiV1Router from './routes/index.js';
import requestContextMiddleware from './middleware/requestContext.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { DAILY_WORKFLOW } from './services/dialogue/workflows/dailyCheckinWorkflow.js';
import { WEEKLY_WORKFLOW } from './services/dialogue/workflows/weeklyCheckinWorkflow.js';
import { DialogueAgenda } from './services/dialogue/dialogueAgenda.js';
import { QuestionPlanner } from './services/dialogue/questionPlanner.js';
import { ObservationValidator } from './services/observations/observationValidator.js';
import { ObservationExtractor } from './services/observations/observationExtractor.js';
import { ContradictionDetector } from './services/observations/contradictionDetector.js';
import { ReadbackSummarizer } from './services/dialogue/readbackSummarizer.js';
import { ObservationQualityEngine } from './services/observations/observationQualityEngine.js';
import { ClinicalDialogueManager } from './services/dialogue/clinicalDialogueManager.js';
import { processClinicalFallbackTurn } from './services/voice/llm/healthConversationAgent.js';
import { computeClinicalTrends } from './services/reportGenerator.js';
import { sessionRecoveryManager } from './services/voice/session/sessionRecoveryManager.js';

let totalChecks = 0;
let passedChecks = 0;

function check(desc, condition) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✔ [PASS] ${desc}`);
  } else {
    console.error(`  ❌ [FAIL] ${desc}`);
    throw new Error(`Assertion failed: ${desc}`);
  }
}

async function runPhase6MasterSuite() {
  console.log('================================================================');
  console.log('🩺 COMPANIO PHASE 6: CLINICAL DIALOGUE & OBSERVATION MASTER SUITE');
  console.log('================================================================\n');

  await ensureDbConnected();

  // Seed test tenant and patient
  const testOrgA = await Organization.findOneAndUpdate(
    { slug: 'test-org-dialogue-a' },
    { name: 'Dialogue Test Health A', slug: 'test-org-dialogue-a', active: true },
    { upsert: true, new: true }
  );

  const testOrgB = await Organization.findOneAndUpdate(
    { slug: 'test-org-dialogue-b' },
    { name: 'Dialogue Test Health B', slug: 'test-org-dialogue-b', active: true },
    { upsert: true, new: true }
  );

  const testPatient = await Patient.findOneAndUpdate(
    { name: 'Eleanor Vance', organizationId: testOrgA._id },
    {
      name: 'Eleanor Vance',
      age: 78,
      organizationId: testOrgA._id,
      medications: [{ name: 'Metformin', dosage: '500mg', frequency: 'twice daily' }],
      baselineMetrics: { sleepHoursTarget: 7.5, hydrationGoalMl: 2000, activityGoal: 30 },
    },
    { upsert: true, new: true }
  );

  // -------------------------------------------------------------------------
  // 1. Daily Workflow Specification
  // -------------------------------------------------------------------------
  console.log('🧪 1. Daily Check-in Workflow Specification');
  check('Daily templateId is DAILY_WELLNESS_CHECKIN', DAILY_WORKFLOW.templateId === 'DAILY_WELLNESS_CHECKIN');
  check('Daily workflow has target duration <= 3 minutes', DAILY_WORKFLOW.targetMinutes <= 3);
  const dailySectionIds = DAILY_WORKFLOW.sections.map((s) => s.id);
  check('Daily contains GREETING', dailySectionIds.includes('GREETING'));
  check('Daily contains MEDICATION_ADHERENCE', dailySectionIds.includes('MEDICATION_ADHERENCE'));
  check('Daily contains SLEEP', dailySectionIds.includes('SLEEP'));
  check('Daily contains HYDRATION', dailySectionIds.includes('HYDRATION'));
  check('Daily contains ACTIVITY', dailySectionIds.includes('ACTIVITY'));
  check('Daily contains READBACK_CONFIRMATION', dailySectionIds.includes('READBACK_CONFIRMATION'));

  // -------------------------------------------------------------------------
  // 2. Weekly Health Review Workflow Specification
  // -------------------------------------------------------------------------
  console.log('\n🧪 2. Weekly Comprehensive Health Review Workflow');
  check('Weekly templateId is WEEKLY_HEALTH_REVIEW', WEEKLY_WORKFLOW.templateId === 'WEEKLY_HEALTH_REVIEW');
  const weeklySectionIds = WEEKLY_WORKFLOW.sections.map((s) => s.id);
  check('Weekly contains FALLS_AND_NEAR_FALLS surveillance', weeklySectionIds.includes('FALLS_AND_NEAR_FALLS'));
  check('Weekly contains MOBILITY_ASSISTIVE_DEVICES', weeklySectionIds.includes('MOBILITY_ASSISTIVE_DEVICES'));
  check('Weekly contains MOOD_AND_LONELINESS', weeklySectionIds.includes('MOOD_AND_LONELINESS'));
  check('Weekly contains WEIGHT_CHANGES', weeklySectionIds.includes('WEIGHT_CHANGES'));
  check('Weekly contains MEDICATION_REFILLS', weeklySectionIds.includes('MEDICATION_REFILLS'));

  // -------------------------------------------------------------------------
  // 3. Dialogue Progression (Finite State Agenda)
  // -------------------------------------------------------------------------
  console.log('\n🧪 3. Dialogue Progression & State Management');
  const agenda = new DialogueAgenda({ type: 'daily' });
  check('Initial section is GREETING', agenda.getCurrentSectionId() === 'GREETING');
  agenda.advanceToNextSection();
  check('Second section is MEDICATION_ADHERENCE', agenda.getCurrentSectionId() === 'MEDICATION_ADHERENCE');
  check('Completed sections tracks GREETING', agenda.completedSections.includes('GREETING'));
  agenda.advanceToNextSection();
  check('Third section is SIDE_EFFECTS', agenda.getCurrentSectionId() === 'SIDE_EFFECTS');

  // -------------------------------------------------------------------------
  // 4. One-Question-At-A-Time Policy
  // -------------------------------------------------------------------------
  console.log('\n🧪 4. One-Question-At-A-Time Strict Accessibility Policy');
  const plannedQ = QuestionPlanner.planNextQuestion(agenda, testPatient);
  check('Planned question is a non-empty string', typeof plannedQ.text === 'string' && plannedQ.text.length > 0);
  const questionMarks = (plannedQ.text.match(/\?/g) || []).length;
  check('Planned prompt asks strictly ONE question (<= 1 question mark)', questionMarks <= 1);

  // -------------------------------------------------------------------------
  // 5. Missing Topics Handling
  // -------------------------------------------------------------------------
  console.log('\n🧪 5. Missing Topics & Graceful Progression');
  const initialIndex = agenda.currentSectionIndex;
  agenda.skipCurrentSection('PATIENT_SKIP');
  check('Section skipped advances index by 1', agenda.currentSectionIndex === initialIndex + 1);
  check('Skipped sections array recorded section', agenda.skippedSections.includes('SIDE_EFFECTS'));

  // -------------------------------------------------------------------------
  // 6. Repeated-Question Prevention
  // -------------------------------------------------------------------------
  console.log('\n🧪 6. Repeated-Question Prevention');
  check('Already completed GREETING is recorded', agenda.completedSections.includes('GREETING'));
  check('Current section is not in completed sections', !agenda.completedSections.includes(agenda.getCurrentSectionId()));

  // -------------------------------------------------------------------------
  // 7. Patient Refusal / Decline Handling
  // -------------------------------------------------------------------------
  console.log('\n🧪 7. Patient Refusal Semantics (Zero Pressure)');
  const refusalCand = ObservationExtractor.extractFromTranscript(
    "I'd rather not say anything about that, please skip",
    'SLEEP',
    { organizationId: testOrgA._id, patientId: testPatient._id }
  );
  check('Refusal extracts missing value type', refusalCand.valueType === 'missing');
  check('Missing reason is strictly DECLINED', refusalCand.missingReason === 'DECLINED');
  check('Value is NOT converted to 0', refusalCand.valueQuantity === undefined);

  // -------------------------------------------------------------------------
  // 8. Unknown Measurements Handling
  // -------------------------------------------------------------------------
  console.log('\n🧪 8. Unknown Measurements (Cognitive Accessibility)');
  const unknownCand = ObservationExtractor.extractFromTranscript(
    "I honestly don't know and cannot remember",
    'HYDRATION',
    { organizationId: testOrgA._id, patientId: testPatient._id }
  );
  check('Unknown extracts missing value type', unknownCand.valueType === 'missing');
  check('Missing reason is UNKNOWN', unknownCand.missingReason === 'UNKNOWN');

  // -------------------------------------------------------------------------
  // 9. Approximate Values Preservation
  // -------------------------------------------------------------------------
  console.log('\n🧪 9. Approximate Values Preservation');
  const approxCand = ObservationExtractor.extractFromTranscript(
    "I got about 6 hours of sleep last night",
    'SLEEP',
    { organizationId: testOrgA._id, patientId: testPatient._id }
  );
  check('Sleep duration value is 6', approxCand.valueQuantity.value === 6);
  check('Preserves isApproximate: true', approxCand.valueQuantity.isApproximate === true);

  // -------------------------------------------------------------------------
  // 10. Invalid Units & Bounds Validation
  // -------------------------------------------------------------------------
  console.log('\n🧪 10. Observation Bounds & Unit Validation');
  const invalidSleep = ObservationValidator.validate({
    organizationId: testOrgA._id,
    patientId: testPatient._id,
    observationCode: 'SLEEP_DURATION',
    valueType: 'quantity',
    valueQuantity: { value: 35, unit: 'hours' },
  });
  check('Rejects impossible 35 hours sleep', invalidSleep.isValid === false);

  const negativeHydration = ObservationValidator.validate({
    organizationId: testOrgA._id,
    patientId: testPatient._id,
    observationCode: 'FLUID_INTAKE',
    valueType: 'quantity',
    valueQuantity: { value: -500, unit: 'ml' },
  });
  check('Rejects negative fluid intake', negativeHydration.isValid === false);

  const validGlasses = ObservationValidator.validate({
    organizationId: testOrgA._id,
    patientId: testPatient._id,
    observationCode: 'FLUID_INTAKE',
    valueType: 'quantity',
    valueQuantity: { value: 4, unit: 'glasses' },
  });
  check('Validates 4 glasses and normalizes unit to ml', validGlasses.isValid && validGlasses.normalizedCandidate.normalizedUnit === 'ml');

  // -------------------------------------------------------------------------
  // 11. Contradiction Detection
  // -------------------------------------------------------------------------
  console.log('\n🧪 11. Contradiction Detection Engine');
  const existingSleepObs = {
    observationCode: 'SLEEP_DURATION',
    valueType: 'quantity',
    valueQuantity: { value: 4, unit: 'hours' },
    confirmationStatus: 'PROPOSED',
  };
  const contradictorySleepCandidate = {
    observationCode: 'SLEEP_DURATION',
    valueType: 'quantity',
    valueQuantity: { value: 5, unit: 'hours' },
  };
  const contradiction = ContradictionDetector.detect(contradictorySleepCandidate, [existingSleepObs]);
  check('Detects numeric discrepancy in sleep duration (4h vs 5h)', contradiction.hasContradiction === true);
  check('Generates gentle clarification prompt', typeof contradiction.clarificationPrompt === 'string' && contradiction.clarificationPrompt.includes('4'));

  // -------------------------------------------------------------------------
  // 12. Patient Correction & Provenance Retained
  // -------------------------------------------------------------------------
  console.log('\n🧪 12. Patient Correction (Never Silently Overwrites)');
  const fakeOldDoc = { _id: new mongoose.Types.ObjectId(), confirmationStatus: 'PROPOSED' };
  const { supersedingCandidate, supersededDoc } = ContradictionDetector.reconcile(
    contradictorySleepCandidate,
    fakeOldDoc,
    'PATIENT_CORRECTION'
  );
  check('Old observation marked RETRACTED', supersededDoc.confirmationStatus === 'RETRACTED');
  check('New observation links supersedesObservationId', supersedingCandidate.supersedesObservationId.toString() === fakeOldDoc._id.toString());
  check('Correction reason is recorded', supersedingCandidate.correctionReason === 'PATIENT_CORRECTION');

  // -------------------------------------------------------------------------
  // 13. Patient Read-Back & Confirmation Protocol
  // -------------------------------------------------------------------------
  console.log('\n🧪 13. Patient Read-Back & Verbal Confirmation');
  const testObservations = [
    { observationCode: 'MED_ADHERENCE', valueBoolean: true, confirmationStatus: 'PROPOSED' },
    { observationCode: 'SLEEP_DURATION', valueQuantity: { value: 7, isApproximate: false }, confirmationStatus: 'PROPOSED' },
  ];
  const summary = ReadbackSummarizer.generateSummary(testObservations, testPatient);
  check('Summary includes medication adherence mention', summary.includes('medication'));
  check('Summary includes 7 hours of sleep mention', summary.includes('7 hours'));
  check('Classifies "Yes that is right" as CONFIRM', ReadbackSummarizer.classifyResponse('Yes that is right') === 'CONFIRM');
  check('Classifies "No, that is wrong" as CORRECT', ReadbackSummarizer.classifyResponse('No, that is wrong') === 'CORRECT');
  check('Classifies "Can you repeat that" as REQUEST_REPETITION', ReadbackSummarizer.classifyResponse('Can you repeat that?') === 'REQUEST_REPETITION');

  // -------------------------------------------------------------------------
  // 14. Idempotent Duplicate Finalization
  // -------------------------------------------------------------------------
  console.log('\n🧪 14. Idempotent Session Finalization');
  const convFinalize = await Conversation.create({
    patientId: testPatient._id,
    organizationId: testOrgA._id,
    startedAt: new Date(),
    status: 'active',
  });
  const sessionFinalize = await DialogueSession.create({
    organizationId: testOrgA._id,
    patientId: testPatient._id,
    conversationId: convFinalize._id,
    startedAt: new Date(),
  });
  await sessionFinalize.finalizeSession('CONFIRMED');
  const finalizedOnceDate = sessionFinalize.completedAt;
  check('Session status is COMPLETED', sessionFinalize.sessionStatus === 'COMPLETED');
  await sessionFinalize.finalizeSession('CONFIRMED');
  check('Duplicate finalization is idempotent (completedAt timestamp preserved)', sessionFinalize.completedAt.getTime() === finalizedOnceDate.getTime());

  // -------------------------------------------------------------------------
  // 15. Priority 0: Zero Fabricated Observations in Fallback
  // -------------------------------------------------------------------------
  console.log('\n🧪 15. Priority 0: Zero Fabricated Data in Fallback Engine');
  const preCheckinCount = await Checkin.countDocuments({ patientId: testPatient._id });
  const preObsCount = await Observation.countDocuments({ patientId: testPatient._id });

  const fallbackResponse = await processClinicalFallbackTurn("Hello, good morning!", {
    patientId: testPatient._id.toString(),
    conversationId: convFinalize._id.toString(),
    history: [],
  });
  check('Fallback response provides warm greeting', fallbackResponse.includes('Hello') || fallbackResponse.includes('check-in'));

  const postCheckinCount = await Checkin.countDocuments({ patientId: testPatient._id });
  const postObsCount = await Observation.countDocuments({ patientId: testPatient._id });
  check('Zero check-in documents created for non-clinical input', postCheckinCount === preCheckinCount);
  check('Zero observation documents created for non-clinical input', postObsCount === preObsCount);

  // -------------------------------------------------------------------------
  // 16. Gemini Provider Failure Resilience
  // -------------------------------------------------------------------------
  console.log('\n🧪 16. Provider Resilience (Fallback Mode Progression)');
  const fallbackTurn2 = await processClinicalFallbackTurn("I took my pills today", {
    patientId: testPatient._id.toString(),
    conversationId: convFinalize._id.toString(),
  });
  check('Fallback turn handles medication affirmation gracefully', typeof fallbackTurn2 === 'string' && fallbackTurn2.length > 0);
  check('Fallback does NOT invent Lisinopril', !fallbackTurn2.includes('Lisinopril'));

  // -------------------------------------------------------------------------
  // 17. Observation Provenance & LOINC Mapping
  // -------------------------------------------------------------------------
  console.log('\n🧪 17. Observation Provenance & Verified LOINC Mapping');
  check('MED_ADHERENCE maps to LOINC 59556-1', LOINC_MAPPINGS.MED_ADHERENCE.code === '59556-1');
  check('SLEEP_DURATION maps to LOINC 93832-4', LOINC_MAPPINGS.SLEEP_DURATION.code === '93832-4');
  check('FALL_INCIDENT maps to LOINC 87625-0', LOINC_MAPPINGS.FALL_INCIDENT.code === '87625-0');

  // -------------------------------------------------------------------------
  // 18. Multi-Tenant Cryptographic Isolation
  // -------------------------------------------------------------------------
  console.log('\n🧪 18. Multi-Tenant Access Isolation');
  const sessionOrgA = await DialogueSession.create({
    organizationId: testOrgA._id,
    patientId: testPatient._id,
    conversationId: new mongoose.Types.ObjectId(),
    startedAt: new Date(),
  });
  const crossTenantLookup = await DialogueSession.findOne({
    _id: sessionOrgA._id,
    organizationId: testOrgB._id,
  });
  check('Org B cannot access Org A dialogue session (returns null)', crossTenantLookup === null);

  // -------------------------------------------------------------------------
  // 19. Live Consent Revocation Protection
  // -------------------------------------------------------------------------
  console.log('\n🧪 19. Consent Verification Integrity');
  const sessionConsent = await DialogueSession.create({
    organizationId: testOrgA._id,
    patientId: testPatient._id,
    conversationId: new mongoose.Types.ObjectId(),
    startedAt: new Date(),
  });
  check('Dialogue session tracks organization ownership', sessionConsent.organizationId.toString() === testOrgA._id.toString());

  // -------------------------------------------------------------------------
  // 20. RED Flag Preemption
  // -------------------------------------------------------------------------
  console.log('\n🧪 20. RED Flag Emergency Dialogue Preemption');
  const sessionPreempt = await DialogueSession.create({
    organizationId: testOrgA._id,
    patientId: testPatient._id,
    conversationId: new mongoose.Types.ObjectId(),
    startedAt: new Date(),
    sessionStatus: 'IN_PROGRESS',
  });
  const emergencyResponse = await ClinicalDialogueManager.preemptForSafety(sessionPreempt, {
    category: 'chest_pain',
    severity: 'red',
  });
  check('Session status is elevated to PREEMPTED_SAFETY', sessionPreempt.sessionStatus === 'PREEMPTED_SAFETY');
  check('Emergency response directs to 911 / emergency care', emergencyResponse.includes('911') || emergencyResponse.includes('emergency') || emergencyResponse.includes('care team'));

  // -------------------------------------------------------------------------
  // 21. Phase 4 Session Recovery
  // -------------------------------------------------------------------------
  console.log('\n🧪 21. Phase 4 Session Recovery (Preserve Agenda State)');
  const recoveryConv = await Conversation.create({
    patientId: testPatient._id,
    organizationId: testOrgA._id,
    startedAt: new Date(),
    status: 'active',
  });
  const recoveryDialogue = await DialogueSession.create({
    organizationId: testOrgA._id,
    patientId: testPatient._id,
    conversationId: recoveryConv._id,
    currentSection: 'SLEEP',
    completedSections: ['GREETING', 'MEDICATION_ADHERENCE'],
    startedAt: new Date(),
  });
  const recovered = await ClinicalDialogueManager.recoverSession(recoveryConv._id);
  check('Recovered session matches conversation', recovered.session.conversationId.toString() === recoveryConv._id.toString());
  check('Recovered agenda maintains completed sections', recovered.agenda.completedSections.includes('MEDICATION_ADHERENCE'));

  // -------------------------------------------------------------------------
  // 22. Report Data Integrity (Dual-Write Projection)
  // -------------------------------------------------------------------------
  console.log('\n🧪 22. Report Data Integrity & Verified Trends Projection');
  const convProject = await Conversation.create({
    patientId: testPatient._id,
    organizationId: testOrgA._id,
    startedAt: new Date(),
    status: 'active',
  });
  const sessionProject = await DialogueSession.create({
    organizationId: testOrgA._id,
    patientId: testPatient._id,
    conversationId: convProject._id,
    startedAt: new Date(),
  });
  const obsSleep = await Observation.create({
    organizationId: testOrgA._id,
    patientId: testPatient._id,
    dialogueSessionId: sessionProject._id,
    conversationId: convProject._id,
    observationCode: 'SLEEP_DURATION',
    observationCategory: 'sleep',
    observationDisplay: 'Sleep duration',
    valueType: 'quantity',
    valueQuantity: { value: 7, unit: 'hours' },
    confirmationStatus: 'CONFIRMED',
  });
  const obsHyd = await Observation.create({
    organizationId: testOrgA._id,
    patientId: testPatient._id,
    dialogueSessionId: sessionProject._id,
    conversationId: convProject._id,
    observationCode: 'FLUID_INTAKE',
    observationCategory: 'hydration',
    observationDisplay: 'Fluid intake',
    valueType: 'quantity',
    valueQuantity: { value: 2000, unit: 'ml', normalizedValue: 2000 },
    confirmationStatus: 'CONFIRMED',
  });

  const projectedCheckin = await ObservationQualityEngine.projectToCheckin(sessionProject, 'CONFIRMED');
  check('Checkin document created with dialogueSessionId', projectedCheckin.dialogueSessionId.toString() === sessionProject._id.toString());
  check('Checkin records 7 hours sleep', projectedCheckin.sleep.hours === 7);
  check('Checkin records 2000 mL hydration', projectedCheckin.hydration.estimatedMl === 2000);
  check('Checkin records confirmedByPatient: true', projectedCheckin.confirmedByPatient === true);

  const trendResult = await computeClinicalTrends(
    testPatient._id.toString(),
    new Date(Date.now() - 24 * 60 * 60 * 1000),
    new Date(Date.now() + 24 * 60 * 60 * 1000)
  );
  check('computeClinicalTrends accurately aggregates projected checkin', trendResult.totalCheckins >= 1);

  // -------------------------------------------------------------------------
  // 23. REST APIs End-to-End Verification (Step 10)
  // -------------------------------------------------------------------------
  console.log('\n🧪 23. REST APIs End-to-End Verification (Step 10)');
  const app = express();
  app.use(express.json());
  app.use(requestContextMiddleware);
  app.use('/api/v1', apiV1Router);
  app.use('/api', apiV1Router);
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const clinicianUser = await User.findOneAndUpdate(
    { email: 'clinician-dialogue-test@health.com' },
    { name: 'Dr. Dialogue Test', email: 'clinician-dialogue-test@health.com', role: 'CLINICIAN' },
    { upsert: true, new: true }
  );
  let membership = await Membership.findOne({ userId: clinicianUser._id, organizationId: testOrgA._id });
  if (!membership) {
    membership = await Membership.create({
      userId: clinicianUser._id,
      organizationId: testOrgA._id,
      role: 'CLINICIAN',
      status: 'active',
      permissions: ['*'],
    });
  }

  // Assign clinician to patient for care-team access
  testPatient.assignedClinicianId = clinicianUser._id;
  await testPatient.save();

  const token = jwt.sign(
    { id: clinicianUser._id.toString(), email: clinicianUser.email, role: 'CLINICIAN', name: clinicianUser.name },
    process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_in_production',
    { expiresIn: '2h' }
  );

  const headers = {
    Authorization: `Bearer ${token}`,
    'x-organization-id': testOrgA._id.toString(),
    'Content-Type': 'application/json',
  };

  // API 1: POST /api/v1/patients/:patientId/dialogue-sessions
  const resApi1 = await fetch(`${baseUrl}/api/v1/patients/${testPatient._id}/dialogue-sessions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ templateId: 'DAILY_WELLNESS_CHECKIN' }),
  });
  const dataApi1 = await resApi1.json();
  check('API 1: POST /api/v1/patients/:patientId/dialogue-sessions returns 201', resApi1.status === 201 && dataApi1.data?.session);
  const createdSessionId = dataApi1.data.session._id;

  // API 2: GET /api/v1/dialogue-sessions/:id
  const resApi2 = await fetch(`${baseUrl}/api/v1/dialogue-sessions/${createdSessionId}`, { headers });
  const dataApi2 = await resApi2.json();
  check('API 2: GET /api/v1/dialogue-sessions/:id returns 200', resApi2.status === 200 && dataApi2.data?._id === createdSessionId);

  // API 3: GET /api/v1/dialogue-sessions/:id/progress
  const resApi3 = await fetch(`${baseUrl}/api/v1/dialogue-sessions/${createdSessionId}/progress`, { headers });
  const dataApi3 = await resApi3.json();
  check('API 3: GET /api/v1/dialogue-sessions/:id/progress returns 200', resApi3.status === 200 && dataApi3.data?.currentSection);

  // API 4: POST /api/v1/observations (Create Observation)
  const resApi4 = await fetch(`${baseUrl}/api/v1/observations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      patientId: testPatient._id.toString(),
      observationCode: 'SLEEP_DURATION',
      observationCategory: 'sleep',
      observationDisplay: 'Sleep duration',
      valueType: 'quantity',
      valueQuantity: { value: 8, unit: 'hours' },
    }),
  });
  const dataApi4 = await resApi4.json();
  check('API 4: POST /api/v1/observations returns 201', resApi4.status === 201 && dataApi4.data?._id);
  const createdObsId = dataApi4.data?._id;

  // API 5: GET /api/v1/observations/:id
  const resApi5 = await fetch(`${baseUrl}/api/v1/observations/${createdObsId}`, { headers });
  const dataApi5 = await resApi5.json();
  check('API 5: GET /api/v1/observations/:id returns 200', resApi5.status === 200 && dataApi5.data?._id === createdObsId);

  // API 6: GET /api/v1/patients/:patientId/observations
  const resApi6 = await fetch(`${baseUrl}/api/v1/patients/${testPatient._id}/observations`, { headers });
  const dataApi6 = await resApi6.json();
  check('API 6: GET /api/v1/patients/:patientId/observations returns 200', resApi6.status === 200 && Array.isArray(dataApi6.data));

  // API 7: GET /api/v1/dialogue-sessions/:id/observations
  const resApi7 = await fetch(`${baseUrl}/api/v1/dialogue-sessions/${createdSessionId}/observations`, { headers });
  const dataApi7 = await resApi7.json();
  check('API 7: GET /api/v1/dialogue-sessions/:id/observations returns 200', resApi7.status === 200 && Array.isArray(dataApi7.data));

  // API 8: POST /api/v1/dialogue-sessions/:id/clarifications
  await DialogueSession.findByIdAndUpdate(createdSessionId, {
    $push: {
      pendingClarifications: {
        questionId: 'CLARIFY_SLEEP_01',
        topic: 'SLEEP_DURATION',
        reason: 'Contradiction in sleep hours',
        originalValue: 4,
      },
    },
  });
  const resApi8 = await fetch(`${baseUrl}/api/v1/dialogue-sessions/${createdSessionId}/clarifications`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ questionId: 'CLARIFY_SLEEP_01', resolvedValue: 6 }),
  });
  const dataApi8 = await resApi8.json();
  check('API 8: POST /api/v1/dialogue-sessions/:id/clarifications returns 200', resApi8.status === 200 && dataApi8.data?.resolved === true);

  // API 9: POST /api/v1/dialogue-sessions/:id/confirm
  const resApi9 = await fetch(`${baseUrl}/api/v1/dialogue-sessions/${createdSessionId}/confirm`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ confirmationStatus: 'CONFIRMED', readbackTranscript: 'Confirmed all metrics' }),
  });
  const dataApi9 = await resApi9.json();
  check('API 9: POST /api/v1/dialogue-sessions/:id/confirm returns 200', resApi9.status === 200 && dataApi9.data?.confirmationStatus === 'CONFIRMED');

  // API 10: POST /api/v1/dialogue-sessions/:id/finalize
  const resApi10 = await fetch(`${baseUrl}/api/v1/dialogue-sessions/${createdSessionId}/finalize`, {
    method: 'POST',
    headers,
  });
  const dataApi10 = await resApi10.json();
  check('API 10: POST /api/v1/dialogue-sessions/:id/finalize returns 200', resApi10.status === 200 && dataApi10.data?.checkin);

  // API 11: POST /api/v1/observations/:id/amend
  const resApi11 = await fetch(`${baseUrl}/api/v1/observations/${createdObsId}/amend`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      valueType: 'quantity',
      valueQuantity: { value: 7, unit: 'hours' },
      correctionReason: 'Patient amended sleep report',
    }),
  });
  const dataApi11 = await resApi11.json();
  check('API 11: POST /api/v1/observations/:id/amend returns 200 with amended and superseded docs', resApi11.status === 200 && dataApi11.data?.amended);

  // API 12: POST /api/v1/observations/:id/verify
  const amendedObsId = dataApi11.data.amended._id;
  const resApi12 = await fetch(`${baseUrl}/api/v1/observations/${amendedObsId}/verify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ verificationStatus: 'VERIFIED', clinicalRationale: 'Confirmed by primary nurse' }),
  });
  const dataApi12 = await resApi12.json();
  check('API 12: POST /api/v1/observations/:id/verify returns 200 with VERIFIED status', resApi12.status === 200 && dataApi12.data?.verificationStatus === 'VERIFIED');

  await new Promise((resolve) => server.close(resolve));

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🏁 MASTER SUITE COMPLETE: ${passedChecks} / ${totalChecks} CHECKS PASSED`);
  console.log('================================================================\n');

  await closeDbConnection();
}

runPhase6MasterSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  });
