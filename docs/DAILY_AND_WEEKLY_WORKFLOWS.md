# Daily and Weekly Check-in Workflows Specification

**System**: Companio Healthcare Platform  
**Document**: Check-in Protocol Cadences, Clinical Objectives, and Flow Control  
**Status**: Production / Phase 6 Verified  

---

## 1. Overview

Companio supports two distinct clinical check-in workflows designed for adults aged 55+:
1. **Daily Wellness Check-in**: A rapid, low-friction surveillance interaction (2–3 minutes) focusing on medication adherence, acute symptom changes, and day-to-day vitals.
2. **Weekly Comprehensive Health Review**: An in-depth geriatric health review (5–7 minutes) capturing balance changes, fall history, mobility aid stability, social connection, weight fluctuations, and refill logistics.

---

## 2. Daily Wellness Check-in Specification

- **Template ID**: `DAILY_WELLNESS_CHECKIN`
- **Target Duration**: 2–3 minutes
- **Cognitive Target**: Low fatigue, clear single questions, conversational reassurance

### Section Progression

| Section | Title | Primary Question | Observation Code | LOINC |
| :--- | :--- | :--- | :--- | :--- |
| `GREETING` | Greeting & Comfort | *"Hello! I'm Companio, here for your daily health check-in. How are you feeling today?"* | None | - |
| `MEDICATION_ADHERENCE` | Prescribed Med Adherence | *"Have you been able to take your scheduled [Medication Names] today?"* | `MED_ADHERENCE` | 59556-1 |
| `SIDE_EFFECTS` | Side Effect Check | *"Are you having any side effects, like an upset stomach, dizziness, or drowsiness?"* | `ACUTE_SYMPTOM` | 75325-1 |
| `NEW_SYMPTOMS` | Acute Symptoms | *"Have you noticed any new aches, stiffness, or discomfort since yesterday?"* | `PAIN_SEVERITY` | 72514-3 |
| `SLEEP` | Sleep Restfulness | *"About how many hours of sleep did you get last night, and did you feel rested?"* | `SLEEP_DURATION` | 93832-4 |
| `HYDRATION` | Fluid Intake | *"About how many glasses of water or cups of fluids have you had so far today?"* | `FLUID_INTAKE` | 9052-2 |
| `NUTRITION` | Meals & Appetite | *"How has your appetite been today? Have you been able to enjoy your regular meals?"* | None | - |
| `ACTIVITY` | Movement & Walking | *"Have you had a chance to get some movement or walking in today?"* | `PHYSICAL_ACTIVITY` | 89555-7 |
| `MOOD_WELLBEING` | 1–10 Wellbeing Rating | *"On a scale from 1 to 10, with 10 being great, how would you rate your overall wellbeing today?"* | `WELLBEING_SCORE` | 71802-3 |
| `PATIENT_CONCERNS` | Care Team Notes | *"Is there anything specific on your mind today that you'd like me to pass along to Dr. Jenkins and your care team?"* | None | - |
| `READBACK_CONFIRMATION` | Read-Back Summary | *"Let me make sure I wrote down everything accurately for your care team..."* | None | - |

---

## 3. Weekly Comprehensive Health Review Specification

- **Template ID**: `WEEKLY_HEALTH_REVIEW`
- **Target Duration**: 5–7 minutes
- **Cognitive Target**: Broad surveillance, proactive safety screening, and longitudinal trends

### Additional Weekly Surveillance Domains

1. **Fall Risk & Near-Misses (`FALLS_AND_NEAR_FALLS` / LOINC 87625-0)**:
   - Inquires into slips, stumbles, loss of balance, or near-falls in the preceding 7 days.
   - Follow-up prompts gently check for injury, cuts, bruises, or lingering pain.
2. **Mobility & Assistive Devices (`MOBILITY_ASSISTIVE_DEVICES` / LOINC 89383-4)**:
   - Assesses stability using canes, walkers, or handrails.
3. **Mood & Social Isolation (`MOOD_AND_LONELINESS` / LOINC 93033-9)**:
   - Evaluates feelings of loneliness and interaction with friends, family, or community members.
4. **Weight Tracking & Fluid Retention (`WEIGHT_CHANGES` / LOINC 29463-7)**:
   - Captures scale readings or subjective symptoms of fluid retention (e.g., swollen ankles, tight socks).
5. **Medication Refill Logistics (`MEDICATION_REFILLS` / LOINC 67711-2)**:
   - Screens for running low on pills, pharmacy difficulties, or upcoming prescription renewal needs.
6. **Upcoming Appointments & Goals (`PATIENT_QUESTIONS_GOALS`)**:
   - Gathers questions the patient wants prepared for their next clinician visit.

---

## 4. Patient Respect & Decline Handling

If a patient expresses hesitation or declines to answer a specific question (*"I'd rather skip that"*, *"Let's move on"*):
1. The system immediately acknowledges respectfully: *"No problem at all, we can skip that."*
2. The section is recorded as `SKIPPED` or `DECLINED` in `DialogueSession.skippedSections`.
3. The conversation advances to the next section without pressuring or re-asking.
