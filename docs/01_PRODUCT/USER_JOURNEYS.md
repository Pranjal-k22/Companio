# Companio — End-to-End User Journeys

**Document Purpose:** Map the multi-step operational journeys across Patient, Clinician, Caregiver, and Admin workflows using verifiable UI routes and API states.  
**Scope:** Core end-to-end journeys across the Companio application.  
**Status:** `IMPLEMENTED / VERIFIED`  
**Owner Category:** Product & Design  
**Last Verified Date:** 2026-11-12  
**Relevant Source Files:** [`client/src/App.jsx`](../../client/src/App.jsx), [`server/src/sockets/voiceSession.js`](../../server/src/sockets/voiceSession.js), [`server/src/routes/`](../../server/src/routes/index.js)

---

## 1. Patient Voice Check-In & Safety Escalation Journey

```mermaid
sequenceDiagram
    actor Patient as Patient (55+)
    participant Home as /patient/home
    participant VoiceUI as /patient/voice-checkin
    participant Gateway as Socket.IO /voice (13-State FSM)
    participant Safety as Dialogue & KeywordSafetyNet
    participant Readback as /patient/checkin-complete
    participant Escalation as Outbox & Zero-PHI Firewall

    Patient->>Home: Opens portal, views greeting & next check-in
    Patient->>VoiceUI: Taps "Start Check-in"
    VoiceUI->>Gateway: Authenticate JWT + verify ConsentRecord
    Gateway-->>VoiceUI: session-started + welcome TTS stream
    Patient->>VoiceUI: Speaks naturally ("I feel chest tightness")
    VoiceUI->>Gateway: Streams 16kHz PCM chunks (audio-chunk)
    Gateway->>Safety: AssemblyAI final transcript -> LLM + KeywordSafetyNet
    Safety-->>Gateway: RED Flag (chest_pain) + calm safety directive
    Gateway-->>VoiceUI: Streams ElevenLabs TTS + emergency banner
    Safety->>Escalation: Flag post('save') triggers BullMQ + Twilio/Resend Zero-PHI alert
    Patient->>VoiceUI: Taps "End Check-in" or completes agenda
    VoiceUI->>Readback: POST /api/v1/dialogue-sessions/:id/confirm & finalize
    Readback-->>Patient: Displays confirmed items, missing items & 3-stage routing evidence
```

---

## 2. Clinician Triage, Evidence Inspection & Report Attestation Journey

```mermaid
flowchart LR
    Triage["/clinician/dashboard (Urgency Sorted)"] -->|"Alert Strip (If unacked RED exists)"| Detail["/clinician/patient/:id"]
    Detail -->|"Inspects Tab: Observations"| Drawer["ObservationDrawer (sourceQuote, turnId, verificationStatus)"]
    Detail -->|"Inspects Tab: Flags"| FlagDialog["FlagDetailDialog (Acknowledge / Assign / Note / Escalate / Resolve with rationale)"]
    Detail -->|"Opens Reports"| Reports["/clinician/reports"]
    Reports -->|"Review Toolbar"| Attest["POST /api/v1/reports/:id/approve (SHA-256 hash + Version Lock)"]
    Attest -->|"Need correction later?"| Amend["POST /api/v1/reports/:id/amend (Creates v2, marks v1 SUPERSEDED)"]
```

---

## 3. Patient-Controlled Caregiver Delegation & Concern Journey

1. Patient visits `/patient/caregivers` (`PatientCaregiverAccess.jsx`) and creates an invitation via `POST /api/v1/patients/:patientId/caregivers/invitations`.
2. Caregiver accepts the SHA-256 single-use invitation (`POST /api/v1/caregivers/invitations/:id/accept`).
3. Patient grants explicit scopes (`CaregiverAccessGrant` via `POST /api/v1/patients/:patientId/caregiver-access`) with optional expiry date.
4. Caregiver logs into `/caregiver/dashboard`, selects the linked patient, and views permitted check-ins/appointments. Every read logs an immutable `CaregiverAccessEvent`.
5. Caregiver submits an observation via `/caregiver/concerns` (`POST /api/v1/caregiver/patients/:patientId/concerns`), stored with `sourceType: 'CAREGIVER_REPORTED'` and evaluated by Phase 5 safety rules.
6. Patient revokes access at any time (`POST /api/v1/caregiver-access/:grantId/revoke`), taking immediate effect on subsequent requests and suppressing notifications.

---

## 4. Organization Admin Governance Journey

1. Admin logs in, selects active clinic via `OrganizationSwitcher`, and opens `/admin/dashboard`.
2. Invites clinicians/coordinators (`POST /api/v1/organizations/:id/invitations`), manages teams (`/admin/teams`), and updates organization emergency contact settings (`PATCH /api/v1/organizations/:id`) with explicit confirmation dialogs (`ConfirmPolicyChangeDialog`, `ConfirmSuspensionDialog`, `ConfirmRoleChangeDialog`).
3. Monitors BullMQ queue backlogs (`/admin/audit-logs`) and evaluates alerting rules (`/api/v1/admin/alerts/evaluate`).

---

## 5. Related Documentation

- [Screen Specifications](../02_DESIGN/SCREEN_SPECIFICATIONS.md)
- [Information Architecture](../02_DESIGN/INFORMATION_ARCHITECTURE.md)
- [Voice Session Lifecycle](../06_AI_AND_VOICE/VOICE_SESSION_LIFECYCLE.md)
