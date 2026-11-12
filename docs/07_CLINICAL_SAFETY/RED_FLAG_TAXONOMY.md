# Companio RED Flag Clinical Taxonomy

## Document Purpose
Documents all 13 acute RED safety flag categories, rule identifiers, detection strategies, and immediate escalation expectations implemented in `safetyRuleRegistry.js` and `FLAG_TAXONOMY`.

## Scope
Covers urgent symptom and safety categories requiring immediate emergency guidance to the patient and urgent clinician notification.

## Status
- **Software Implementation:** `IMPLEMENTED` & `TESTED` (`npm run test:safety`)
- **Clinical Advisory Board Medical Sign-Off:** `BLOCKED` / `PENDING` (Required before live patient pilot)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/services/safety/safetyRuleRegistry.js](../../server/src/services/safety/safetyRuleRegistry.js)
- [server/src/services/safety/keywordSafetyNet.js](../../server/src/services/safety/keywordSafetyNet.js)
- [server/src/services/safety/patientSafetyResponse.js](../../server/src/services/safety/patientSafetyResponse.js)
- [server/src/services/voice/llm/healthConversationAgent.js](../../server/src/services/voice/llm/healthConversationAgent.js)

---

## 1. Registered RED Flag Categories (13 Rules)

| Category | Rule ID (`v1.0`) | Approved Pattern Count | Clinical Meaning (`DEFAULT_SAFETY_RULES`) |
| :--- | :--- | :--- | :--- |
| `chest_pain` | `RULE_RED_CHEST_PAIN_V1` | 9 | Acute chest pain, pressure, squeezing, or heaviness suggesting myocardial ischemia |
| `severe_breathlessness` | `RULE_RED_SEVERE_BREATHLESSNESS_V1` | 7 | Acute severe shortness of breath or respiratory distress |
| `stroke_signs` | `RULE_RED_STROKE_SIGNS_V1` | 8 | Sudden neurological deficit, facial droop, arm weakness, or slurred speech (FAST) |
| `severe_new_pain` | `RULE_RED_SEVERE_NEW_PAIN_V1` | 5 | Sudden onset severe, unbearable, or incapacitating pain |
| `self_harm_ideation` | `RULE_RED_SELF_HARM_IDEATION_V1` | 6 | Explicit or implicit suicidal or self-harm ideation |
| `severe_allergic_reaction` | `RULE_RED_SEVERE_ALLERGIC_REACTION_V1` | 5 | Symptoms of systemic anaphylaxis including airway constriction or swelling |
| `fall_with_injury` | `RULE_RED_FALL_WITH_INJURY_V1` | 5 | Fall resulting in head impact, immobility, or suspected fracture in older adult |
| `severe_dizziness_fainting` | `RULE_RED_SEVERE_DIZZINESS_FAINTING_V1` | 5 | Syncope, loss of consciousness, or acute incapacitating vertigo |
| `rapid_weight_loss` | `RULE_RED_RAPID_WEIGHT_LOSS_V1` | 4 | Severe, unexpected weight loss over short duration in geriatric patient |
| `serious_medication_reaction` | `RULE_RED_SERIOUS_MED_REACTION_V1` | 4 | Acute severe adverse drug reaction, rash with peeling, or drug-induced arrhythmia |
| `high_risk_medication_lapse` | `RULE_RED_HIGH_RISK_MED_LAPSE_V1` | 4 | Lapse in critical, high-risk medications (anticoagulants, insulin, anti-rejection) |
| `high_fever_confusion` | `RULE_RED_HIGH_FEVER_CONFUSION_V1` | 4 | High fever accompanied by acute confusion or delirium (possible sepsis/meningitis) |
| `uncontrolled_bleeding` | `RULE_RED_UNCONTROLLED_BLEEDING_V1` | 5 | Uncontrolled hemorrhage, vomiting blood, or active bleeding not stopping with pressure |

---

## 2. Runtime Behavior on Detection

1. **Immediate Dialogue Preemption:** `DialogueSession` enters `PREEMPTED_SAFETY` and speaks/displays calm emergency guidance (`patientSafetyResponse.js`) instructing the patient or caregiver to call configured organization emergency services (defaulting cleanly via org settings).
2. **Persistence & Escalation:** `Flag` saves with `severity: 'red'`, `ruleId`, `ruleVersion`, `sourceQuote`, and triggers `Flag.post('save')` -> `escalationPolicyEngine` -> multi-channel dispatch (`EMAIL` / `SMS` depending on org escalation policy and env toggles).
3. **Caregiver Concerns Included:** Caregiver concerns submitted via `/api/v1/caregiver/patients/:patientId/concerns` pass through the same RED-flag safety evaluator.

---

## 3. Related Documentation
- [YELLOW_FLAG_TAXONOMY.md](./YELLOW_FLAG_TAXONOMY.md)
- [RISK_ENGINE.md](./RISK_ENGINE.md)
- [ESCALATION_POLICY.md](./ESCALATION_POLICY.md)
- [SAFETY_RULE_TAXONOMY.md](./SAFETY_RULE_TAXONOMY.md)
