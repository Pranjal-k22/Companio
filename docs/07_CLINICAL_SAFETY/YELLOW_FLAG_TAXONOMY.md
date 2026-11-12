# Companio YELLOW Flag Clinical Taxonomy

## Document Purpose
Documents all 10 non-acute YELLOW safety and care-coordination categories implemented in `safetyRuleRegistry.js` and `FLAG_TAXONOMY`.

## Scope
Covers sub-acute symptoms, minor adherence slips, lifestyle decline, and social/logistical barriers surfaced for clinician review during routine triage.

## Status
- **Software Implementation:** `IMPLEMENTED` & `TESTED` (`npm run test:safety`)
- **Clinical Advisory Board Review:** `BLOCKED` / `PENDING`

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/services/safety/safetyRuleRegistry.js](../../server/src/services/safety/safetyRuleRegistry.js)
- [server/src/services/voice/llm/healthConversationAgent.js](../../server/src/services/voice/llm/healthConversationAgent.js)

---

## 1. Registered YELLOW Flag Categories (10 Rules)

| Category | Rule ID (`v1.0`) | Approved Pattern Count | Clinical Scope |
| :--- | :--- | :--- | :--- |
| `mild_new_symptom` | `RULE_YELLOW_MILD_NEW_SYMPTOM_V1` | 6 | New mild symptoms requiring non-urgent clinical follow-up |
| `missed_dose_or_mild_side_effect` | `RULE_YELLOW_MISSED_DOSE_MILD_SIDE_EFFECT_V1` | 6 | Single missed dose or minor predictable drug side effect |
| `sleep_disturbance` | `RULE_YELLOW_SLEEP_DISTURBANCE_V1` | 4 | Insomnia, frequent waking, or non-restorative sleep |
| `mild_mood_change` | `RULE_YELLOW_MILD_MOOD_CHANGE_V1` | 4 | Sub-syndromal low mood, mild anxiety, or reduced motivation |
| `appetite_or_hydration_concern` | `RULE_YELLOW_APPETITE_HYDRATION_V1` | 4 | Mildly decreased fluid or dietary intake over 24–48 hours |
| `reduced_activity` | `RULE_YELLOW_REDUCED_ACTIVITY_V1` | 4 | Moving less or skipping daily walking routine |
| `minor_gi_issue` | `RULE_YELLOW_MINOR_GI_ISSUE_V1` | 4 | Mild non-acute gastrointestinal symptoms (mild nausea, constipation) |
| `loneliness_isolation` | `RULE_YELLOW_LONELINESS_ISOLATION_V1` | 4 | Social isolation or feelings of chronic loneliness |
| `mobility_aid_concern` | `RULE_YELLOW_MOBILITY_AID_CONCERN_V1` | 4 | Issues with walker, cane, wheelchair, or home safety |
| `appointment_logistics` | `RULE_YELLOW_APPOINTMENT_LOGISTICS_V1` | 4 | Transportation or scheduling barriers to clinic visits |

---

## 2. Patient UX & Clinical Handling

- Unlike `RED` flags, `YELLOW` flags do **not** preempt an active conversation with urgent emergency instructions.
- On the patient dashboard, items needing follow-up avoid alarming emergency-red badges (Stage 11 replaced red "Needs attention" patient chips with a calm non-severity visual badge while preserving `RED` / `YELLOW` clinical triage semantics for clinicians).
- Clinicians review, acknowledge, assign, note, or resolve `YELLOW` flags inside the Triage Queue (`/clinician/triage`).

---

## 3. Related Documentation
- [RED_FLAG_TAXONOMY.md](./RED_FLAG_TAXONOMY.md)
- [FLAG_LIFECYCLE.md](./FLAG_LIFECYCLE.md)
- [CLINICAL_SAFETY_OVERVIEW.md](./CLINICAL_SAFETY_OVERVIEW.md)
