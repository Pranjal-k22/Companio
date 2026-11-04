# COMPANIO — SCREEN SPECIFICATIONS & STATE LIBRARY
## Exhaustive Screen Matrix, 16 Voice Check-In States, 150% Zoom Layouts & State Edge Cases

**Document Reference:** `docs/SCREEN_SPECIFICATIONS.md`  
**Milestone:** Frontend Redesign — Stage 0 Screen Specifications  
**Author:** Lead Healthcare Frontend Engineer & UX Architect  
**Evaluation Date:** 2026-11-04  
**Naming Standard:** `[Role]/[Screen]/[State]/[Mode]`  

---

## 1. Screen Architecture & Naming Convention

Every screen, state variant, and viewport adaptation follows a strict taxonomy:
`[Role]/[Screen]/[State]/[Mode]`
- **Role:** `Patient` | `Clinician` | `Admin` | `Caregiver`
- **Screen:** `Login` | `Consent` | `Home` | `VoiceCheckIn` | `ReadBack` | `Complete` | `Appointments` | `Pathology` | `Triage` | `PatientChart` | `Reports` | `VoiceLogs`
- **State:** `Default` | `Loading` | `Empty` | `Partial` | `Error` | `Offline` | `Unauthorized` | `Expired` | `Stale` | `ConsentWithdrawn` | `Zoom150`
- **Mode:** `Day` | `Night`

---

## 2. Patient Experience Screen Specifications

### 2.1 `Patient/Home`
- **Purpose:** Primary hub for older adults (55+). Provides immediate orientation, greeting, single primary CTA to start voice check-in, and recent verified check-in history.
- **Key Invariants:**
  - Zero hardcoded sensor metrics (removes fabricated "72 bpm").
  - Primary Voice CTA button: Minimum **64 × 64 px** (or 160px circular touch target on desktop).
  - Time-of-day greeting ("Good morning", "Good afternoon", "Good evening").
- **States Matrix:**
  - `Patient/Home/Default/Day`: Ivory canvas `#F6F3EC`, white card surfaces, large bold text, coral/blue voice button.
  - `Patient/Home/Default/Night`: Deep navy canvas `#0B1D2E`, slate blue surface `#12293D`, light ivory text.
  - `Patient/Home/Loading`: Skeletons matching card dimensions; no layout shift.
  - `Patient/Home/Empty`: Honest message: *"No check-ins completed yet. Tap the button above to begin your first conversation."*
  - `Patient/Home/Zoom150`: Rem base scales to 24px; cards wrap into single-column stack; zero overlapping text.

---

### 2.2 `Patient/VoiceCheckIn` (16 VoiceOrb States)
- **Purpose:** Full-viewport conversational interface powered by Web Audio API AudioWorklet linear PCM capture, real-time Socket.io streaming, and ElevenLabs speech synthesis.
- **Layout:** Centered VoiceOrb with 240px breathing room; live conversational captions below; prominent bottom controls (Stop Check-in, Mute Microphone, Repeat Prompt, Accessibility Text Toggle).

```
┌────────────────────────────────────────────────────────┐
│ [← Exit]           Voice Health Check-in       [🔊 0.85x]│
├────────────────────────────────────────────────────────┤
│                                                        │
│                     ( VoiceOrb )                       │
│                     [ State: 04 ]                      │
│                                                        │
│           "I'm listening... Speak naturally."          │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Caption Box: "I took my blood pressure medicine  │  │
│  │ with breakfast, but my knee feels stiff..."      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│   [ Repeat Prompt ]      [ 🔴 STOP ]      [ Text Mode ]│
└────────────────────────────────────────────────────────┘
```

#### Detailed Specification of the 16 Voice States:
1. **`State 01: Idle`** (`Patient/Voice/Idle`)
   - *Status Text:* "Tap to start your check-in"
   - *Orb Visual:* Soft breathing glow (Ivory/Blue), static radius.
   - *Controls:* Green/Coral "Start Conversation" CTA.
2. **`State 02: Mic Permission`** (`Patient/Voice/MicPermission`)
   - *Status Text:* "Please allow microphone access when prompted"
   - *Orb Visual:* Pulsing amber ring; microphone glyph badge.
   - *Controls:* "Grant Access" / "Need Help?" button.
3. **`State 03: Connecting STT`** (`Patient/Voice/ConnectingSTT`)
   - *Status Text:* "Connecting to secure audio server..."
   - *Orb Visual:* Dual orbital rings spinning at 1.5s period.
   - *Controls:* "Cancel" button.
4. **`State 04: Listening`** (`Patient/Voice/Listening`)
   - *Status Text:* "I'm listening... Speak naturally"
   - *Orb Visual:* Concentric ripple waves expanding outward smoothly.
   - *Controls:* Active "Mute" and "Stop" buttons (minimum 56px).
5. **`State 05: User Speaking`** (`Patient/Voice/UserSpeaking`)
   - *Status Text:* "Listening..."
   - *Orb Visual:* Reactive vertical waveform spikes driven by Web Audio AnalyserNode volume.
   - *Captions:* Live streaming partial transcript rendered with `aria-live="polite"`.
6. **`State 06: Processing`** (`Patient/Voice/Processing`)
   - *Status Text:* "Thinking..."
   - *Orb Visual:* Inward-contracting particles; color shifts to warm amber.
   - *Action:* Server executes deterministic Keyword Safety Net and checks endpoint boundaries.
7. **`State 07: Generating`** (`Patient/Voice/Generating`)
   - *Status Text:* "Formulating response..."
   - *Orb Visual:* Swirling Blue and Coral vortex.
   - *Action:* LLM clinical agent assembling dialogue response and structured observation tools.
8. **`State 08: Agent Speaking`** (`Patient/Voice/AgentSpeaking`)
   - *Status Text:* "Companio is speaking..."
   - *Orb Visual:* Rhythmic sinusoidal pulsing at senior speech cadence (0.85x).
   - *Controls:* "Interrupt / Tap to Speak" button enabled.
9. **`State 09: Barge-In`** (`Patient/Voice/BargeIn`)
   - *Status Text:* "Listening to you..."
   - *Orb Visual:* Instant flash contraction (50ms); immediately snaps to `Listening`.
   - *Action:* Halts client audio playback, emits `voice:barge_in` to server.
10. **`State 10: Paused`** (`Patient/Voice/Paused`)
    - *Status Text:* "Check-in paused. Tap resume when ready."
    - *Orb Visual:* Static twin vertical pill indicators in frosted glass container.
    - *Controls:* Large "Resume Check-in" button (64px).
11. **`State 11: Reconnecting`** (`Patient/Voice/Reconnecting`)
    - *Status Text:* "Network interrupted. Reconnecting..."
    - *Orb Visual:* Pulsing amber hazard perimeter ring; countdown timer for 5-minute resume window.
    - *Controls:* "Retry Now" button.
12. **`State 12: Recovery`** (`Patient/Voice/Recovery`)
    - *Status Text:* "Session restored. Continuing check-in."
    - *Orb Visual:* Concentric green snap back to center; restores prior turn state.
13. **`State 13: Read-Back`** (`Patient/Voice/ReadBack`)
    - *Status Text:* "Please confirm what I heard:"
    - *Orb Visual:* Steady soft blue aura with checkmark badge.
    - *Content:* Summary card displaying captured observations (e.g. *"Medication taken: Yes; Sleep: 7 hours"*).
    - *Controls:* Large "That's Correct" (Yes) and "Let Me Correct That" (No) buttons.
14. **`State 14: Finalizing`** (`Patient/Voice/Finalizing`)
    - *Status Text:* "Saving your check-in..."
    - *Orb Visual:* Orbitals condensing into center point.
    - *Action:* Emits `voice:session:end`, writes Checkin document and LOINC observations to DB.
15. **`State 15: Completed`** (`Patient/Voice/Completed`)
    - *Status Text:* "Check-in confirmed and saved."
    - *Orb Visual:* Radiant emerald/gold bloom expansion.
    - *Controls:* Auto-redirects or provides "View Summary" button.
16. **`State 16: Aborted / Safety Alert`** (`Patient/Voice/Aborted`)
    - *Status Text:* "🚨 Critical Symptom Detected"
    - *Orb Visual:* High-contrast Crimson/Red glowing border with AlertTriangle icon.
    - *Content:* Deterministic emergency directive: *"Please stop and dial 911 immediately or have someone take you to the emergency room."*
    - *Controls:* Large 64px red "Call 911" button.

---

### 2.3 `Patient/Appointments`
- **Purpose:** View upcoming visits, review past appointments, and request a consultation slot.
- **Data Contract:** Binds to `GET /api/v1/appointments` and `POST /api/v1/appointments`.
- **States:**
  - `Empty`: *"No appointments scheduled. Tap below to book a checkup with your care team."*
  - `Booking Modal`: Accessible modal with focus trap, querying live clinic doctors or displaying general consultation request.

---

### 2.4 `Patient/Pathology`
- **Purpose:** Certified lab panels and reference ranges.
- **Data Contract:** Binds to `GET /api/v1/lab-results/patient/:patientId`.
- **States:**
  - `Default`: Table cards showing panel name, collection date, ordering doctor, markers, and reference ranges.
  - `Empty`: *"No laboratory test panels recorded yet."* (Honest empty state).

---

## 3. Clinician Workspace Screen Specifications

### 3.1 `Clinician/Triage`
- **Purpose:** Emergency triage queue for on-call clinicians.
- **Data Contract:** `GET /api/v1/flags/triage`.
- **Visual Structure:**
  - Urgent RED Flags (SLA < 15 min countdown badge) sorted to the top.
  - Sub-acute YELLOW Flags (< 4 hour SLA badge).
  - Explicit Action Buttons: "Acknowledge" (transitions flag status to acknowledged) and "Resolve" (opens resolution dialog).
- **Safety Rule:** Never displays "Resolved" without a stored clinician user ID and written rationale.

---

### 3.2 `Clinician/PatientChart` (Tabs View)
- **Purpose:** Comprehensive longitudinal medical record for assigned patients.
- **Data Contract:** `GET /api/v1/patients/:id`, `/flags`, `/reports`, `/observations`.
- **Tabs:**
  1. **Overview & Trends:** Recharts line chart showing weekly adherence %, sleep duration, hydration, and weight change.
  2. **Observations:** Structured LOINC table with confidence scores, verbatim quotes, and amendment history.
  3. **Risk Flags:** History of all raised flags with timestamps, detection source, and delivery audit trail.
  4. **Weekly Reports:** Draft reports awaiting review vs attested reports with SHA-256 signatures.
  5. **Attestation Dialog:** Cryptographic sign-off modal with 21 CFR Part 11 attestation statement.

---

## 4. Caregiver & Family Portal Screen Specifications

### 4.1 `Caregiver/Dashboard` (Linked Patients Hub)
- **Purpose:** Multi-patient overview for authorized family members, adult children, and legal proxies.
- **Data Contract:** Binds to `GET /api/v1/caregiver/patients`.
- **Status:** ACTIVE / IMPLEMENTED (Backend verified via Phase 8 master suite)
- **Visual Structure & Hierarchy:**
  - Welcome Banner with Caregiver identity, role indicator, and proxy authorization notice.
  - Linked Patients Cards Grid:
    - Loved one's name, age, and assigned facility.
    - Relationship badge (`Daughter`, `Son`, `Spouse`, `Healthcare Proxy`, `Family Member`).
    - Active Scopes Pills (e.g. `WELLNESS_SUMMARY_READ`, `APPOINTMENT_READ`, `MEDICATION_SCHEDULE_READ`).
    - Validity timer: Expiration date or *"Indefinite access until revoked by patient"*.
    - Quick Action Buttons:
      - *"View Overview"* ➔ Navigates to `/caregiver/patient/:patientId`.
      - *"Report Health Note"* ➔ Navigates to `/caregiver/concerns?patientId=:patientId`.
      - *"Assisted Check-in"* ➔ Available only if `VOICE_CHECKIN_ASSIST` is granted.
- **States Matrix:**
  - `Default/Day`: Ivory canvas `#F6F3EC`, white card surfaces, Bloom tokens.
  - `Default/Night`: Slate surface `#12293D`, navy canvas `#0B1D2E`.
  - `Loading`: PatientCardSkeletons with pulsing shimmer.
  - `Empty`: Honest guidance: *"No loved ones have shared access with you yet. Ask your family member to send an invitation from their Family & Caregiver settings."*
  - `Error`: RFC 9457 error card with retry button.
  - `Offline`: Cached linked patient view with offline status indicator.

---

### 4.2 `Caregiver/PatientOverview` (Patient-Approved Wellness Summaries)
- **Purpose:** High-level health summary strictly filtered to patient-authorized data scopes.
- **Data Contract:** `GET /api/v1/caregiver/patients/:patientId/overview` and `GET /caregiver/patients/:patientId/medications`. Requires `WELLNESS_SUMMARY_READ`.
- **Status:** ACTIVE / IMPLEMENTED
- **Key Invariants & Negative Boundaries:**
  - Zero raw physician clinical notes; clinician-confidential drafts are strictly concealed.
  - Caregivers cannot prescribe, alter medication dosages, or cancel appointments without permission.
- **Visual Structure:**
  - Back Navigation pill to Caregiver Dashboard.
  - Patient Profile Header with relationship attribution.
  - Latest Completed Check-in Card: Timestamp, mood chip (`Good`, `Fair`, `Tired`), and patient-approved daily summary.
  - Next Upcoming Appointment Card: Physician name, clinic location, specialty, and scheduled date/time (requires `APPOINTMENT_READ`).
  - Medication Regimen & Adherence Card: Prescribed list with adherence percentage (requires `MEDICATION_SCHEDULE_READ` / `MEDICATION_ADHERENCE_READ`).
- **States Matrix:**
  - `Default`: Populated cards with data freshness timestamp (`"Data last updated 15m ago"`).
  - `ScopeDenied`: Informational card: *"Your loved one has not granted permission to view this section."*
  - `Loading`: Card skeletons.
  - `Empty`: *"No check-in or appointment data available for this period."*

---

### 4.3 `Caregiver/Concerns` (`CAREGIVER_REPORTED` Structured Concern Submission)
- **Purpose:** Secure channel for family caregivers to report non-emergency observations to the attending care team.
- **Data Contract:** `POST /api/v1/caregiver/patients/:patientId/concerns` and `GET /caregiver/patients/:patientId/concerns`. Requires `CONCERN_SUBMIT`.
- **Status:** ACTIVE / IMPLEMENTED
- **Clinical Safety Net Integration:**
  - **Emergency Banner (Always Visible):**
    > *"🚨 EMERGENCY NOTICE: If your loved one is experiencing chest pain, difficulty breathing, a severe fall with head injury, or sudden confusion, STOP and dial 911 immediately. Do not submit this form for emergencies."*
- **Visual Structure:**
  - Patient Selector dropdown.
  - Observation Category selector:
    - `mobility_deterioration` (Unsteady walking, increased fall frequency)
    - `cognitive_decline` (Confusion, memory lapse, disorientation)
    - `medication_side_effect` (Nausea, dizziness, rash)
    - `appetite_loss` (Skipping meals, noticeable weight drop)
    - `social_isolation` (Withdrawal, low mood, lack of engagement)
    - `other` (General non-emergency observation)
  - Detailed Description textarea with character counter.
  - Submit Button: *"Submit Health Note to Care Team"*.
  - Submitted History Timeline: Cards detailing observation date, category, status (`Recorded for Care Team`), and immutable badge: `Source: CAREGIVER_REPORTED`.
- **States Matrix:**
  - `Default`: Clean form with historical submissions list.
  - `Submitting`: Disabled button with loading indicator.
  - `SuccessToast`: *"Concern securely routed to attending clinical care team."*
  - `SafetyNetAlert`: If acute keywords are detected, backend raises a Phase 5 RED flag and UI highlights emergency 911 advice.

---

### 4.4 `Patient/CaregiverAccess` (Patient-Side Permission Center)
- **Purpose:** Full cognitive accessibility portal for older adults (55+) to grant, modify, and revoke family access.
- **Data Contract:** Binds to `GET /api/v1/patients/:patientId/caregivers`, `POST /patients/:patientId/caregivers/invitations`, `POST /caregivers/invitations/:id/revoke`, and `GET /patients/:patientId/caregiver-access-events`.
- **Status:** ACTIVE / IMPLEMENTED
- **Autonomy Invariant:** The patient holds sovereign ownership over their record. Caregiver access can be terminated instantly with a single tap.
- **Visual Structure & Components:**
  - Empowerment Header: *"You are in control. Choose who can see your health updates, and change or stop sharing anytime."*
  - Active Family Caregivers List:
    - Caregiver name, email, telephone, and relationship label (`Daughter - Primary Helper`).
    - Status Badge: `Active Sharing` vs `Invite Pending`.
    - Granted Permissions summary chips.
    - Expiration badge: e.g. `Expires in 82 days` or `Permanent until revoked`.
    - One-Click Revoke Button: Red button opening confirmation dialog.
  - Invite Family Member Modal:
    - Email or phone input.
    - Relationship type and custom label (e.g. `Son - David`).
    - Granular Scopes Checklist (8 plain-English toggles):
      1. `WELLNESS_SUMMARY_READ`: See daily wellness overview.
      2. `CHECKIN_HISTORY_READ`: See when check-ins are completed.
      3. `APPOINTMENT_READ`: See upcoming doctor appointments.
      4. `MEDICATION_SCHEDULE_READ`: See prescribed medications and times.
      5. `MEDICATION_ADHERENCE_READ`: See whether medicines were taken.
      6. `VOICE_CHECKIN_ASSIST`: Assist with voice check-in conversations.
      7. `CONCERN_SUBMIT`: Send notes and observations to the doctor.
      8. `NOTIFICATION_RECEIVE`: Receive check-in and appointment reminders.
    - Expiration Selector: 30 days, 90 days, 180 days, 1 year, or Indefinite.
  - Tamper-Evident Access Audit History:
    - Chronological table showing every time a caregiver viewed records: Date/time, Caregiver name, Action (`VIEW_WELLNESS_SUMMARY`, `VIEW_MEDICATION_SCHEDULE`), and outcome (`ALLOWED`).
- **States Matrix:**
  - `Default`: Active caregivers cards with audit timeline.
  - `Empty`: Illustration with *"No family members linked yet. Tap 'Invite Helper' to invite a trusted family member."*
  - `InviteModalOpen`: Accessible dialog with focus trap.
  - `RevokeConfirmation`: Dialog explaining immediate access cut-off.

---

## 5. State Library Matrix (Comprehensive Edge Cases)

Every screen supports the standardized state library:

| State Variant | Visual Presentation & Behavior | Standard Copy / Component |
| :--- | :--- | :--- |
| **Loading** | Content-matching skeleton cards with subtle wave pulse | `<Skeleton />` / `<TableSkeleton />` |
| **Empty** | Honest empty state illustration with calm, non-accusatory guidance | *"No records found in this view."* + Action CTA |
| **Partial** | Warning banner at top: offline cached data shown | *"Showing saved offline data. Will re-sync when connection restores."* |
| **Error** | RFC 9457 Problem Details card; neutral tone | *"We couldn't connect to your clinic records. Reference ID: req_9821."* |
| **Offline** | High-contrast bottom toast with Retry button | `<NetworkStatusToast />` ("You are currently offline") |
| **Unauthorized** | Non-revealing 403 screen; zero data leakage | *"You do not have access to this record."* + Back to Dashboard |
| **Expired** | Redirects to `/login?expired=true` with session timeout notice | *"Your session has expired. Please log in again to protect your data."* |
| **Stale** | Subtle badge indicating data timestamp | *"Last updated 2 hours ago. [Refresh Now]"* |
| **Consent Withdrawn** | Terminal screen for voice session; all streaming halted | *"Voice check-in stopped: Consent for AI processing was withdrawn."* |
| **Zoom 150%** | Single-column responsive reflow; 24px base font | Zero text truncation; touch targets expand to 64px+ |

