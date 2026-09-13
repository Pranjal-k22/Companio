# Companio — Product Requirements Document (PRD)

**AI Voice Agent for Healthcare (Adults 55+)**

---

## 1. Overview

Companio is a voice-first health and wellness check-in agent designed for adults aged 55+. It replaces typing-heavy or menu-driven health apps with natural spoken conversation, while giving clinicians structured, actionable insight instead of raw transcripts.

**Core value proposition:**
> Patient → Natural Voice Conversation → Structured Patient Insights → Actionable Clinician Summary

Companio supports clinical workflows — it never diagnoses, prescribes, or contradicts a clinician's care plan.

---

## 2. Target Users

| User | Needs |
|---|---|
| **Patient (55+)** | Simple, low-friction way to report health status without typing or navigating menus; wants to feel heard, not interrogated |
| **Clinician** | Fast, trustworthy summary of patient status between visits; needs urgent issues surfaced immediately, not buried in a transcript |
| **Care team / Admin** | Oversight of escalation reliability and system-wide flag trends |

---

## 3. Goals & Success Criteria

- Conversations feel simple, empathetic, responsive, and human — not robotic or clinical
- No patient concern is silently dropped — critical issues are always captured and escalated
- Clinicians get a **report**, not a transcript — concise, prioritized, and trend-aware
- Low end-to-end voice latency (target: under 2–3 seconds turn latency; achieved 775ms in testing)
- The agent never diagnoses or overrides clinical judgment

---

## 4. Core Features

### Patient-Facing
- Daily and weekly voice check-ins
- Medication adherence and side-effect tracking
- Symptom, sleep, activity, nutrition, and hydration tracking
- Open-ended concern capture ("what's on your mind")
- Appointment preparation conversations
- Approved health/wellness education (non-diagnostic)
- Reassuring, plain-language session summaries, including escalation notices when relevant

### Clinician-Facing
- Patient list dashboard sorted by urgency (open red flags surfaced first)
- Per-patient report view: Overview, Red Flags, Yellow Flags, Positive Progress, Trends, Patient Concerns, Follow-up
- Trend charts (adherence %, sleep, activity, hydration, weight) over time
- Flag review workflow (mark reviewed / escalated)
- On-demand report regeneration and report history

### Safety & Escalation
- Fixed red/yellow flag taxonomy (LLM classifies only into predefined categories)
- Dual-detection: LLM tool-calling **plus** an independent deterministic keyword safety net, so a red flag is never missed solely due to an LLM miss
- Automatic clinician notification (email/SMS) on red flag creation, regardless of detection source
- Full audit trail (EscalationEvent log) of every notification attempt, success or failure

---

## 5. Non-Goals / Out of Scope

- No diagnosis, treatment recommendation, or medication dosage changes
- No replacement of clinical judgment — Companio surfaces information, clinicians act on it
- No real-time emergency response (this is a check-in tool, not a 911/ambulance dispatch system)

---

## 6. Fixed Red / Yellow Flag Taxonomy

**🔴 Red (escalate immediately)**
`chest_pain`, `severe_breathlessness`, `stroke_signs`, `severe_new_pain`, `self_harm_ideation`, `severe_allergic_reaction`, `fall_with_injury`, `severe_dizziness_fainting`, `rapid_weight_loss`, `serious_medication_reaction`, `high_risk_medication_lapse`, `high_fever_confusion`, `uncontrolled_bleeding`

**🟡 Yellow (monitor / flag for review)**
`mild_new_symptom`, `missed_dose_or_mild_side_effect`, `sleep_disturbance`, `mild_mood_change`, `appetite_or_hydration_concern`, `reduced_activity`, `minor_gi_issue`, `loneliness_isolation`, `mobility_aid_concern`, `appointment_logistics`

---

## 7. User Flows

### Patient Check-in Flow
1. Open app → warm greeting, one large "Start check-in" button
2. Voice conversation (mic centerpiece, live captions, single "End check-in" exit always visible)
3. Session ends → plain-language thank-you + reassuring escalation notice if applicable

### Clinician Review Flow
1. Log in → dashboard shows patients sorted by open red flag count
2. Click into a patient → full report (Overview → Red Flags → Yellow Flags → Positive Progress → Trends → Concerns → Follow-up)
3. Mark flags reviewed/escalated, optionally regenerate report

---

## 8. Success Metrics

- End-to-end voice turn latency (measured: 775ms)
- Red flag detection recall (LLM + safety net combined; safety net independently verified to catch LLM misses)
- Report usefulness — a clinician should be able to act on it without reading the transcript
- Zero hard failures — report generation and escalation both have fallback paths that never hard-fail
