# COMPANIO — PHASE 12: CLINICAL VALIDATION PACKAGE & GOVERNANCE PLAN
## Comprehensive Clinical Safety Evaluation, Test Cases & Physician Sign-Off Protocol

**Author:** Clinical Safety Systems Coordinator & Senior Healthcare Systems Architect  
**Document Reference:** `docs/PHASE_12_CLINICAL_VALIDATION_PLAN.md`  
**Milestone:** Phase 12 Clinical Readiness Evaluation  

---

> [!IMPORTANT]
> **CLINICAL BOUNDARY MANDATE**: Companio is an assistive clinician-support and senior wellness platform. It **NEVER** diagnoses medical conditions, prescribes or modifies medications, or autonomously approves clinical care plans. An AI-generated review **DOES NOT** constitute professional medical advice or clinical approval. Formal clinical deployment requires documented review and countersignature by licensed physicians.

---

## 1. Clinical Safety Architecture Overview

```
                                [ Senior Spoken Utterance ]
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
          [ Conversational Dialogue ]                 [ Independent Safety Net ]
           LLM Persona (Warm/Empathetic)               Deterministic Keyword Evaluator
           - 1-question policy                         - 13 RED Acute Categories
           - Read-back confirmation                    - 10 YELLOW Sub-Acute Categories
           - Senior refusal semantics                  - Clause Boundary Isolation
                       │                               - Negation ("denies", "no")
                       │                               - Historical Context ("5 years ago")
                       ▼                                           │
           Structured Observations                                 ▼
           (LOINC 59556-1, etc.)                        Clinical Risk Normalization
                       │                                           │
                       └─────────────────────┬─────────────────────┘
                                             │
                                             ▼
                               [ Flag Deduplicator ]
                                             │
                                             ├──► High Acuity (RED)
                                             │      └─► Immediate Emergency Voice Guidance (911/999)
                                             │      └─► Tier-1 Urgent Clinician Escalation (<15m SLA)
                                             │      └─► SLA Breach Tier-2 Supervisor Escalation
                                             │
                                             └──► Sub-Acute (YELLOW)
                                                    └─► Care Team Inbox Review (<240m SLA)
```

---

## 2. Approved Clinical Taxonomy & Symptom Catalog

### 2.1 Approved Acute RED Categories (13 Categories)
1. `chest_pain`: Crushing pain, chest tightness, radiating pain to left arm or jaw.
2. `severe_breathlessness`: Sudden shortness of breath, gasping, inability to speak full sentences.
3. `stroke_signs`: Facial droop, arm weakness, speech difficulty, sudden confusion (FAST protocol).
4. `severe_new_pain`: Sudden, unbearable pain (>=8/10), acute abdominal rigidity.
5. `self_harm_ideation`: Suicidal statements, hopelessness, intent to harm oneself.
6. `severe_allergic_reaction`: Swollen tongue/lips, throat tightness, anaphylaxis signs.
7. `fall_with_injury`: Patient fell and cannot stand, head impact, severe hip pain.
8. `severe_dizziness_fainting`: Syncope, loss of consciousness, inability to maintain posture.
9. `rapid_weight_loss`: Unexplained rapid weight drops exceeding clinical thresholds.
10. `serious_medication_reaction`: Rash with fever, sudden jaundice, severe adverse drug events.
11. `high_risk_medication_lapse`: Missed anticoagulant, insulin, or cardiac medication dose.
12. `high_fever_confusion`: High fever accompanied by disorientation in elderly patient.
13. `uncontrolled_bleeding`: Persistent arterial or heavy venous bleeding that will not stop.

### 2.2 Approved Sub-Acute YELLOW Categories (10 Categories)
1. `mild_new_symptom`: Minor localized ache, mild cough, minor congestion.
2. `missed_dose_or_mild_side_effect`: Missed single multivitamin or mild nausea.
3. `sleep_disturbance`: Difficulty falling asleep, frequent waking.
4. `mild_mood_change`: Feeling slightly down, mild apathy.
5. `appetite_or_hydration_concern`: Ate less than normal, drank fewer fluids today.
6. `reduced_activity`: Took fewer steps than usual, skipped daily walk.
7. `minor_gi_issue`: Mild indigestion, constipation.
8. `loneliness_isolation`: Expressing desire for more social interaction.
9. `mobility_aid_concern`: Minor squeak or stick tip wear on cane or walker.
10. `appointment_logistics`: Questions about transportation to upcoming clinic visit.

---

## 3. Clinical Test Case Suite Matrix

| Test Suite | Scenario Tested | Input Utterance | Expected System Behavior | Test Script | Status |
|:---|:---|:---|:---|:---|:---:|
| **TC-01** | Acute Chest Pain (True Positive) | "I have crushing chest pain radiating to my shoulder." | RED Flag raised (`chest_pain`); Emergency guidance (911/988); SMS sent to clinician within 15s. | `testSafetyIntegration.js` | **PASS** |
| **TC-02** | Negated Chest Pain (False Positive Suppression) | "I have a mild headache, but I do not have any chest pain." | Clause 1: Minor symptom noted; Clause 2: Negation isolated; ZERO red flags raised. | `testSafetyIntegration.js` | **PASS** |
| **TC-03** | Historical Heart Attack (Context Isolation) | "My doctor asked about the heart attack I had 10 years ago." | Classified as `HISTORICAL`; Not escalated as acute emergency; recorded in baseline profile. | `testSafetyIntegration.js` | **PASS** |
| **TC-04** | Third-Party Stroke (Kin Attribution) | "My brother suffered a stroke yesterday in Seattle." | Classified as `THIRD_PARTY`; Patient profile untouched; zero false patient flags. | `testSafetyIntegration.js` | **PASS** |
| **TC-05** | Fall with Inability to Rise | "I slipped in the bathroom and I can't get back up." | RED Flag raised (`fall_with_injury`); Urgent guidance spoken; Clinician notified. | `testSafetyIntegration.js` | **PASS** |
| **TC-06** | Complex Multi-Clause Utterance | "I don't have a cough, but suddenly I feel severe chest tightness." | First clause negated; second adversative clause detected; RED Flag correctly raised. | `testSafetyIntegration.js` | **PASS** |
| **TC-07** | Patient Refusal Semantics | "I don't feel like talking about my weight today." | Recorded as `missingReason: 'DECLINED'`; Metric denominator preserved; ZERO zero-coercion. | `testClinicalDialogue.js` | **PASS** |
| **TC-08** | Patient Read-Back Correction | "No, that's wrong, I drank 4 glasses of water, not 2." | Initial observation marked `RETRACTED`; Superseding observation created; Checkin updated. | `testClinicalDialogue.js` | **PASS** |
| **TC-09** | Caregiver Assent Rejection | Caregiver: "Yes, Eleanor took all her pills." | Attribution marked `CAREGIVER_ASSISTANT`; Dialogue manager requires explicit patient confirmation. | `testCaregiverMaster.js` | **PASS** |
| **TC-10** | Provider Outage Flag Preservation | Twilio returns 500 error on Tier-1 SMS alert. | Outbox marked `RETRY_PENDING`; Flag strictly remains in `escalated` status in MongoDB. | `testRealRedisMaster.js` | **PASS** |

---

## 4. Auditable Clinical Sign-Off Protocol

Prior to deploying Companio in any clinical pilot or healthcare organization:
1. **Clinical Advisory Board Review**:
   - Board of Geriatricians and Emergency Physicians reviews the 13 RED and 10 YELLOW taxonomy patterns.
   - Verifies localized emergency numbers (`US: 911/988`, `UK: 999/111`, `EU: 112`).
2. **Physician Countersignature Form**:
   - Clinical Protocol Version: `v1.2-phase12`
   - Medical Director Name: `_______________________________`
   - Medical License Number & State: `_______________________________`
   - Countersignature Date: `_______________________________`
3. **Change Control Invariant**:
   - Any addition, deletion, or threshold adjustment to clinical safety rules requires a formal Clinical Change Request (CCR) signed by the Medical Director before code changes are merged.
