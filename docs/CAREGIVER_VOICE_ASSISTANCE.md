# 🎙️ Companio — Assisted Voice Check-In Protocol & Speaker Attribution (Phase 8)

**Document Reference**: `docs/CAREGIVER_VOICE_ASSISTANCE.md`  
**Status**: ACTIVE / PRODUCTION-GRADE  
**Author**: Principal Healthcare AI Voice Architect & Clinical Dialogue Lead  

---

## 1. Clinical Context & Need for Assistance

Many older adults (aged 55+) with mild cognitive impairment, arthritis, hearing loss, or speech apraxia benefit from having an adult child, spouse, or aide sit with them during their daily or weekly voice check-in. The caregiver may help clarify a question ("Mom, they're asking how you slept last night") or report medication changes ("She took her morning blood pressure pill at 8:00 AM").

However, mixing caregiver speech with patient speech creates severe clinical risks if unmanaged:
1. Caregiver opinions might override the patient's actual self-report.
2. The AI might attribute caregiver symptoms to the patient (or vice versa).
3. The caregiver might confirm check-in read-backs without the patient's actual assent.

Companio Phase 8 resolves this with a strictly governed **Assisted Voice Check-in Protocol**.

---

## 2. Assisted Voice Session Initiation

1. **Pre-requisite Scope**: The caregiver must have an active `CaregiverAccessGrant` containing the `VOICE_CHECKIN_ASSIST` scope.
2. **Session Start API**:
   `POST /api/v1/caregiver/patients/:id/voice-assistance`
   - Validates multi-tenant isolation and scope.
   - Creates or links an active `DialogueSession`.
   - Embeds assistance metadata in the session:
     ```javascript
     dialogueSession.assistedByCaregiver = {
       isAssisted: true,
       caregiverUserId: caregiverUser._id,
       caregiverRelationshipId: relationship._id,
       assistedAt: new Date()
     };
     ```
3. **Transparent Patient Greeting**: When the voice session starts, the AI announces the caregiver's presence clearly to ensure total transparency:
   > *"Hello Eleanor! I see your daughter Sarah is joining us to help with today's check-in. Whenever you are ready, let's begin."*

---

## 3. Real-Time Speaker Attribution Model

During the check-in, utterances processed by STT and the Dialogue Manager are classified into distinct speaker roles:

| Speaker Role Identifier | Description | Clinical Processing Rules |
| :--- | :--- | :--- |
| `PATIENT_SPEAKER` | Explicit patient self-report | Standard observation extraction; authoritative voice. |
| `CAREGIVER_ASSISTANT` | Caregiver prompting or repeating | Ignored for clinical metrics; used for conversational context. |
| `CAREGIVER_REPORT` | Caregiver reporting an observation | Extracted as observation with `sourceType = 'CAREGIVER_REPORTED'` and `performerType = 'CAREGIVER'`. |
| `SYSTEM_AGENT` | Companio AI voice output | Dialogue prompts, guidance, and read-back summaries. |

---

## 4. The Authoritative Patient Confirmation Invariant

**Absolute Clinical Invariant**: In an assisted check-in, caregiver assent can NEVER substitute for patient verbal confirmation.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        VERBAL CONFIRMATION RULE                        │
├────────────────────────────────────────────────────────────────────────┤
│ Scenario: The AI reads back the weekly summary and asks:               │
│           "Eleanor, does this accurately describe your past week?"     │
│                                                                        │
│ Caregiver says: "Yes, that's right, she took all her pills."           │
│ Patient remains silent or says: "Wait, I didn't take them Tuesday."    │
│                                                                        │
│ System Decision: The session status remains UNCONFIRMED.               │
│                  The system prompts:                                   │
│                  "Eleanor, do you agree with this summary?"            │
│ Only explicit PATIENT affirmation sets confirmedByPatient = true.      │
└────────────────────────────────────────────────────────────────────────┘
```

If the patient declines or disagrees, the observation amendment workflow (`POST /api/v1/observations/:id/amend`) is triggered, superseding the incorrect observation with provenance tracking.
