import {
  generatePatientSafetyResponse,
  EMERGENCY_NUMBERS,
} from '../../services/safety/patientSafetyResponse.js';

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

export async function runPatientSafetyResponseTests() {
  console.log('\n======================================================');
  console.log('🧪 Running Suite 8: Governed Patient Safety Guidance');
  console.log('======================================================');

  // 1. RED Flag: Chest Pain Emergency Guidance
  const chestPainGuidance = generatePatientSafetyResponse({
    severity: 'red',
    category: 'chest_pain',
    patientName: 'Eleanor',
    jurisdiction: 'US',
  });

  assert(chestPainGuidance.severity === 'red', 'Guidance severity is red');
  assert(chestPainGuidance.requiresImmediateAction === true, 'Requires immediate action flag is true');
  assert(chestPainGuidance.actionRequired === 'CALL_EMERGENCY', 'Action required is CALL_EMERGENCY');
  assert(chestPainGuidance.emergencyNumber === '911', 'US Emergency number is 911');
  assert(chestPainGuidance.guidanceText.includes('911'), 'Guidance text includes emergency number 911');
  assert(chestPainGuidance.spokenPrompt.length > 0, 'Spoken prompt is generated for TTS');
  assert(chestPainGuidance.spokenPrompt.includes('911'), 'Spoken prompt directs to 911');

  // 2. RED Flag: Self-Harm Ideation & 988 Lifeline
  const selfHarmGuidance = generatePatientSafetyResponse({
    severity: 'red',
    category: 'self_harm_ideation',
    jurisdiction: 'US',
  });

  assert(selfHarmGuidance.actionRequired === 'CALL_CRISIS_LIFELINE', 'Action is CALL_CRISIS_LIFELINE');
  assert(selfHarmGuidance.emergencyNumber === '988', 'Directs to 988 Suicide & Crisis Lifeline');
  assert(selfHarmGuidance.guidanceText.includes('988'), 'Guidance includes 988');
  assert(selfHarmGuidance.spokenPrompt.includes('988'), 'Spoken prompt includes 988');

  // 3. RED Flag: Stroke Signs & FAST
  const strokeGuidance = generatePatientSafetyResponse({
    severity: 'red',
    category: 'stroke_signs',
    jurisdiction: 'US',
  });

  assert(strokeGuidance.actionRequired === 'CALL_EMERGENCY', 'Action is CALL_EMERGENCY for stroke');
  assert(
    strokeGuidance.guidanceText.toLowerCase().includes('weakness') ||
    strokeGuidance.guidanceText.toLowerCase().includes('speaking'),
    'Stroke guidance highlights neurological FAST symptoms'
  );

  // 4. YELLOW Flag: Sub-acute Guidance
  const yellowGuidance = generatePatientSafetyResponse({
    severity: 'yellow',
    category: 'medication_lapse',
    patientName: 'Robert',
  });

  assert(yellowGuidance.severity === 'yellow', 'Guidance severity is yellow');
  assert(yellowGuidance.requiresImmediateAction === false, 'Requires immediate action is false for yellow');
  assert(yellowGuidance.actionRequired === 'NOTIFY_CLINICIAN', 'Action is NOTIFY_CLINICIAN');
  assert(
    yellowGuidance.guidanceText.includes('care team') ||
    yellowGuidance.guidanceText.includes('doctor'),
    'Encourages care team follow-up'
  );

  // 5. Strict Clinical Non-Diagnostic Compliance Invariant
  // Guidance MUST NOT state definitive diagnoses or prescribe medications
  const allGuidanceOutputs = [
    chestPainGuidance.guidanceText,
    chestPainGuidance.spokenPrompt,
    selfHarmGuidance.guidanceText,
    selfHarmGuidance.spokenPrompt,
    strokeGuidance.guidanceText,
    strokeGuidance.spokenPrompt,
    yellowGuidance.guidanceText,
    yellowGuidance.spokenPrompt,
  ];

  const forbiddenDiagnosticTerms = [
    'you are having a heart attack',
    'you are experiencing a myocardial infarction',
    'take two aspirin',
    'take an aspirin',
    'take your nitroglycerin',
    'inject your insulin',
    'you have asthma',
  ];

  let diagnosticViolation = false;
  for (const text of allGuidanceOutputs) {
    for (const term of forbiddenDiagnosticTerms) {
      if (text.toLowerCase().includes(term)) {
        diagnosticViolation = true;
        console.error(`Violation: Text contained forbidden term "${term}": ${text}`);
      }
    }
  }
  assert(!diagnosticViolation, 'Clinical Safety Invariant: Guidance contains zero unauthorized diagnostic or prescriptive claims');

  // 6. Jurisdiction Internationalization
  const ukGuidance = generatePatientSafetyResponse({
    severity: 'red',
    category: 'chest_pain',
    jurisdiction: 'UK',
  });
  assert(ukGuidance.emergencyNumber === '999', 'UK emergency number resolves to 999');

  const euGuidance = generatePatientSafetyResponse({
    severity: 'red',
    category: 'chest_pain',
    jurisdiction: 'EU',
  });
  assert(euGuidance.emergencyNumber === '112', 'EU emergency number resolves to 112');

  console.log(`\nSuite 8 Summary: ${passed} passed, ${failed} failed`);
  return { suite: 'PatientSafetyResponse', passed, failed };
}

// Allow standalone execution
if (process.argv[1]?.endsWith('testPatientSafetyResponse.js')) {
  runPatientSafetyResponseTests().then(({ passed, failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

export default runPatientSafetyResponseTests;
