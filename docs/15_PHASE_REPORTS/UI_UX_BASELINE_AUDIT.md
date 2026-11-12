# COMPANIO — UI/UX BASELINE AUDIT
## Exhaustive Codebase Audit, Data Provenance, Component Inventory, Voice Architecture & Gap Analysis

**Document Reference:** `docs/UI_UX_BASELINE_AUDIT.md`  
**Milestone:** Frontend Redesign — Stage 0 Baseline Audit  
**Author:** Lead Frontend Engineer & Healthcare Design Systems Architect  
**Evaluation Date:** 2026-11-04  
**Git Baseline Commit:** `9c225bd` (Phase 12.2 complete) on branch `main`  
**Tech Stack:** React 18.3.1, Vite 5.4.21, Tailwind CSS 3.4.3, React Router v7.18.3, Recharts 3.10.1, Socket.io Client 4.7.5  

---

## 1. Repository & Branch Verification

- **Current Git Branch:** `main`
- **Latest Commit:** `9c225bd` (`feat(validation): close external evidence and finalize pilot authorization gates (Phase 12.2)`).
- **Milestone State:** Phase 12.2 engineering validation, pilot-safe de-identification engine (`server/src/services/privacy/deidentificationService.js`), and four-tier authorization gates completed. Working tree is clean.
- **Discrepancy Notes against the User Brief:**
  - The master brief outlines a Figma file structure (Pages 00 to 09, variable collections, component sets, and prototype flows). The repository is a production React/Vite/Tailwind implementation without Figma plugin integrations. All tokens, component specifications, 16 voice states, and screen architectures must be implemented and documented in code and design-system specifications.
  - The existing codebase uses a generic Tailwind `teal` palette (`#14b8a6`) and dark slate theme (`#090d16`). It completely lacks the mandated **"Bloom" palette** (Ivory `#EAE6DE`, Blue `#226192`, Coral `#EF8557`) and does not use CSS variables for Day and Night modes.
  - `VoiceSession.jsx` exists in `client/src/pages/` but is completely unmounted and orphaned from `App.jsx`, while `VoiceCheckIn.jsx` is the active mounted patient route.

---

## 2. Current Routes & Role-to-Page Matrix

All routes are registered in `client/src/App.jsx` using `react-router-dom` v7 with role-based route protection (`ProtectedRoute.jsx`).

| URL Route | Page Component File | Permitted Roles | Current Implementation Status & Live Data Binding |
| :--- | :--- | :--- | :--- |
| `/login` | `client/src/pages/Login.jsx` | Public | Live API (`POST /api/v1/auth/login`). Includes demo quick-login card. |
| `/register` | `client/src/pages/Register.jsx` | Public | Live API (`POST /api/v1/auth/register`). |
| `/patient/home` | `client/src/pages/PatientHome.jsx` | `PATIENT` | **Mixed:** Live check-ins (`GET /api/v1/checkins/:id`); **Fabricated hardcoded 72 bpm heart rate metric**. |
| `/patient/appointments` | `client/src/pages/PatientAppointments.jsx` | `PATIENT` | **Mixed:** Live appointments (`GET /api/v1/appointments`, `POST /api/v1/appointments`); **Hardcoded doctor select in modal**. |
| `/patient/voice-checkin` | `client/src/pages/VoiceCheckIn.jsx` | `PATIENT` | **Live WebSocket:** `/voice` namespace. AudioWorklet linear PCM capture (`useRawPCM`), barge-in, recovery. |
| `/patient/checkin-complete`| `client/src/pages/CheckInComplete.jsx` | `PATIENT` | **Static:** Hardcodes "Dr. Jenkins' team" and unverified notification delivery claims. |
| `/patient/pathology` | `client/src/pages/PatientPathology.jsx` | `PATIENT` | **Live API:** `GET /api/v1/lab-results/patient/:id`. Honest empty state when no labs exist. |
| `/patient/doctors` | `client/src/pages/PatientDoctors.jsx` | `PATIENT` | **100% FABRICATED DATA:** Hardcoded static array of 4 fictitious doctors (`doctorsList`). No API binding. |
| `/patient/settings` | `client/src/pages/PatientSettings.jsx` | `PATIENT` | **Live API:** `GET /api/v1/auth/me`. Updates preferences, emergency contacts, and audio cadence. |
| `/patient/caregivers` | `client/src/pages/patient/PatientCaregiverAccess.jsx`| `PATIENT` | **Live API:** Phase 8 caregiver APIs (`/patients/:id/caregivers/*`). |
| `/clinician/dashboard` | `client/src/pages/ClinicianDashboard.jsx` | `CLINICIAN`, `ADMIN` | **Live API:** `GET /api/v1/patients`, `GET /api/v1/flags/triage`, `GET /api/v1/reports`. |
| `/clinician/patient/:id`| `client/src/pages/PatientDetail.jsx` | `CLINICIAN`, `ADMIN` | **Live API:** Longitudinal chart, Recharts line/bar trends, flag resolution, report attestation. |
| `/clinician/appointments`| `client/src/pages/ClinicianAppointments.jsx`| `CLINICIAN`, `ADMIN` | **Live API:** `GET /api/v1/appointments`. |
| `/clinician/voice-logs` | `client/src/pages/ClinicianVoiceLogs.jsx` | `CLINICIAN`, `ADMIN` | **Live API:** `GET /api/v1/conversations`. Audio playback UI present but unconsented audio blocked. |
| `/clinician/settings` | `client/src/pages/ClinicianSettings.jsx` | `CLINICIAN`, `ADMIN` | **Live API:** Profile and clinic settings. |
| `/caregiver/dashboard` | `client/src/pages/caregiver/CaregiverDashboard.jsx` | `CAREGIVER` | **Live API:** `GET /api/v1/caregiver/patients`. Missing required `[PLANNED]` badge. |
| `/caregiver/patient/:id`| `client/src/pages/caregiver/CaregiverPatientOverview.jsx`| `CAREGIVER` | **Live API:** Granular scope-filtered wellness overview. Missing `[PLANNED]` badge. |
| `/caregiver/checkins` | `client/src/pages/caregiver/CaregiverCheckins.jsx` | `CAREGIVER` | **Live API:** Checkin history. Missing `[PLANNED]` badge. |
| `/caregiver/appointments`| `client/src/pages/caregiver/CaregiverAppointments.jsx`| `CAREGIVER` | **Live API:** Shared appointment calendar. Missing `[PLANNED]` badge. |
| `/caregiver/concerns` | `client/src/pages/caregiver/CaregiverConcerns.jsx` | `CAREGIVER` | **Live API:** Non-diagnostic concern logging. Missing `[PLANNED]` badge. |
| `/caregiver/notifications`| `client/src/pages/caregiver/CaregiverNotifications.jsx`| `CAREGIVER` | **Live API:** Audit log view. Missing `[PLANNED]` badge. |
| *(Unmounted)* | `client/src/pages/VoiceSession.jsx` | `None` | **LEGACY ORPHAN:** Phase 4 developer debug test harness. Not imported or routed in `App.jsx`. |

---

## 3. Existing Components Inventory

```
client/src/components/
├── common/
│   ├── ErrorBoundary.jsx         --> Traps unhandled React rendering exceptions with recovery UI
│   ├── NetworkStatusToast.jsx    --> Displays offline status banner when navigator.onLine is false
│   └── Skeleton.jsx              --> Card, Table, Vitals, and Stat skeleton loaders
├── layout/
│   ├── AppLayout.jsx             --> Sidebar + Header + Main wrapper with responsive margin toggles
│   ├── Header.jsx                --> Title, quick voice check-in, search input, theme & font toggle
│   └── Sidebar.jsx               --> Role-based navigation items (Patient, Clinician, Caregiver), collapse toggle
└── ProtectedRoute.jsx            --> Checks JWT token, user presence, and allowedRoles array
```

### Component Inconsistencies & Duplications:
1. **No Shared UI Primitives**: Buttons, Inputs, Cards, Badges, and Modal dialogs are currently written as raw inline Tailwind classes repeatedly across every page file instead of encapsulated UI components.
2. **Hardcoded Inline Dialogs**: Modals in `PatientAppointments.jsx` and `PatientCaregiverAccess.jsx` are custom `fixed inset-0` `div`s lacking accessible focus traps (`aria-modal`, keyboard Esc listeners, focus restore).
3. **Missing VoiceOrb Component**: The voice check-in UI relies on a simple pulsating CSS ring in `VoiceCheckIn.jsx` rather than a dedicated 16-state component set.

---

## 4. Visual Patterns & Design System Discrepancies

1. **Color Violations**:
   - Current: Tailwind `teal-500` (`#14b8a6`), `emerald-400`, `slate-950` (`#090d16`), and `slate-900`.
   - Mandatory: **"Bloom" Palette** exclusively:
     - Ivory `#EAE6DE`
     - Blue `#226192`
     - Coral `#EF8557`
     - Derived semantic tokens on `:root` (Day) and `[data-theme="night"]` (Night).
2. **Coral Usage Violation**:
   - Coral is currently absent, but the design brief strictly specifies that Coral `#EF8557` must **NEVER** be used as a text color in Day mode due to low contrast (~2.1:1). It is strictly reserved for fills, glows, rings, and voice waves with dark text (`#0F2A40`) on it.
3. **Clinical Severity Styling**:
   - Current: Generic `red-500` and `amber-500` classes scattered across flags and general errors.
   - Mandatory: Clinical severity tokens (`critical`: Day `#B3261E` on `#FBE3E1`, Night `#FF8A80` on `#3A1714`; `caution`: Day `#8A4B00` on `#FCE9C8`, Night `#F2C36B` on `#3A2A0C`) locked exclusively to clinical flag components, always with an icon and the words `RED` or `YELLOW`.

---

## 5. Live API Data vs Mocked / Fabricated Data

| Page Component | Data Domain | Data Origin | Audit Finding | Remediation Required |
| :--- | :--- | :--- | :--- | :--- |
| `PatientHome.jsx` | Heart Rate Vitals | Hardcoded (`72 bpm`) | **FABRICATED DATA** | Remove hardcoded vitals card. Show honest check-in status or real extracted LOINC metrics. |
| `PatientHome.jsx` | Checkin Summaries | `GET /api/v1/checkins/:id` | Live Data | Retain live data binding. |
| `PatientDoctors.jsx` | Doctor Directory | Static `doctorsList` array | **100% FABRICATED DATA** | Query active clinic care team from organization or display honest empty state. |
| `CheckInComplete.jsx`| Follow-up Notice | Hardcoded String | **FABRICATED / UNSAFE COPY** | Replace *"I've shared your update with Dr. Jenkins' team"* with neutral confirmation: *"Your check-in has been recorded and saved to your chart."* |
| `PatientAppointments.jsx`| Doctor Dropdown | Static `<select>` options | **FABRICATED OPTIONS** | Populate dropdown dynamically or provide general consultation booking inquiry. |
| `ClinicianDashboard.jsx`| Triage Flags | `GET /api/v1/flags/triage` | Live Data | Retain live data binding. |
| `PatientDetail.jsx` | Reports & Observations | `GET /api/v1/reports`, `/observations` | Live Data | Retain live data binding. |

---

## 6. Responsive & Accessibility Gaps

1. **Responsive Viewport Gaps**:
   - **Mobile (390px)**: Sidebar slides out over content, but some tables in `PatientDetail.jsx` and `ClinicianVoiceLogs.jsx` cause horizontal scrolling without responsive wrapping.
   - **Tablet (768px)**: Grid layout in `PatientHome.jsx` (`grid-cols-2 lg:grid-cols-4`) squashes metric cards; needs clean 8-column layout with 24px gutters.
   - **Desktop (1024px / 1440px)**: Lacks strict container max-width constraints, stretching charts too wide on 1440px displays.
2. **Accessibility (WCAG 2.1 AA/AAA) Gaps**:
   - **Touch Targets**: Several icon buttons in `Header.jsx`, `PatientAppointments.jsx`, and `PatientDetail.jsx` have bounding boxes of 36×36px or 40×40px, failing the senior ergonomics mandate of **minimum 56×56px** (and 64px for primary voice actions).
   - **Font Scaling**: `ThemeContext.jsx` currently only supports a binary toggle (`html.text-lg-accessibility`), scaling to ~18px. It fails the requirement for continuous 100%, 125%, and 150% text size modes via root `font-size` rem scaling.
   - **Screen Reader Landmarks**: Modal dialogs lack `role="dialog"`, `aria-modal="true"`, and focus trapping. Captions in voice check-in need explicit `aria-live="polite"` regions.

---

## 7. State Library Gaps Matrix

| Major Screen | Loading State | Empty State | Partial / Degraded | Error State | Offline Toast | Unauthorized (403) | Session Expired (401) | Stale Data |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `PatientHome` | `<Skeleton />` | Missing (assumes checkins) | Missing | Alert text | Yes (`NetworkStatusToast`) | Redirects | Redirects | Missing |
| `VoiceCheckIn`| Spinner | N/A | Missing | Error banner | Yes | Redirects | Redirects | N/A |
| `Appointments`| `<TableSkeleton />`| Text only | Missing | Error banner | Yes | Redirects | Redirects | Missing |
| `Pathology` | `<TableSkeleton />`| Text with icon | Missing | Error banner | Yes | Redirects | Redirects | Missing |
| `ClinicianDashboard`| `<PatientCardSkeleton />`| Simple text | Missing | Error banner | Yes | Redirects | Redirects | Missing |
| `PatientDetail` | `<VitalsChartSkeleton />`| N/A | Missing | Error banner | Yes | Redirects | Redirects | Missing |

---

## 8. Voice Interaction Analysis: `VoiceSession.jsx` vs `VoiceCheckIn.jsx`

An audit of the voice codebase reveals two separate voice session files:

1. **`client/src/pages/VoiceSession.jsx` (LEGACY DEVELOPER TEST HARNESS)**:
   - Created during Phase 4 voice gateway development.
   - Contains raw diagnostic panels: audio chunks sent/received counters, telemetry latency breakdowns (`finalTranscriptAt`, `speechToAudioLatencyMs`, `ttsLatencyMs`), and an event log terminal.
   - Uses `useMicCapture.js` (standard `MediaRecorder`) rather than the hardened `AudioWorklet`.
   - **Status:** **NOT MOUNTED OR ROUTED** in `App.jsx`. It is an orphaned development utility.
2. **`client/src/pages/VoiceCheckIn.jsx` (CURRENT ACTIVE PATIENT ROUTE)**:
   - Mounted at `/patient/voice-checkin` in `App.jsx`.
   - Uses `useRawPCM.js` (Web Audio API `AudioWorklet` downsampling to 16kHz 16-bit linear PCM on an audio thread), `useAudioPlayback.js` (Web Audio API chunk queue), `useBargeIn.js` (`voice:barge_in`), and `useVoiceRecovery.js`.
   - Features streaming partial captions, auto-scroll, and start/stop controls.
   - **Deficiency:** Currently only models 4 crude states (`idle`, `listening`, `processing`, `speaking`). It lacks the full 16 visual states specified in the master brief.

**Conclusion:** Consolidate all voice check-in logic into a modernized `VoiceCheckIn.jsx` anchored by the newly engineered 16-state `VoiceOrb` component, while safely retiring `VoiceSession.jsx`.

---

## 9. Socket.io Voice Protocol & Consumed Event Names

The frontend interacts with the server-authoritative state machine in `server/src/sockets/voiceSession.js` via the `/voice` Socket.io namespace.

### 9.1 Events Emitted by UI to Server:
1. `start-session` / `voice:session:start`: Initiates check-in (`{ type: 'daily' | 'weekly', assistedByCaregiver, caregiverId }`).
2. `audio-chunk` / `voice:audio:chunk`: Raw 16kHz 16-bit linear PCM audio buffer.
3. `voice:barge_in`: Informs server that user spoke during AI speech (`{ turnId, timestamp }`).
4. `voice:session:resume`: Requests session resumption across network reconnect (`{ resumeToken, conversationId, lastAckSequence }`).
5. `voice:session:pause`: Temporarily pauses session audio.
6. `voice:session:unpause`: Resumes paused session audio.
7. `end-session` / `voice:session:end`: Finalizes and persists check-in session.

### 9.2 Events Consumed by UI from Server:
1. `session-started` / `voice:session:started`: Session metadata, conversation ID, and clinical agenda.
2. `voice:state:change`: Emits transition payload: `{ currentState, previousState, turnId, timestamp }` across the 13 server FSM states (`CREATED`, `CONSENT_CHECKED`, `CONNECTING_STT`, `LISTENING`, `PROCESSING`, `GENERATING`, `SPEAKING`, `PAUSED`, `RECONNECTING`, `FINALIZING`, `COMPLETED`, `ABORTED`, `FAILED`).
3. `transcript-partial` / `voice:transcript:partial`: Live interim speech-to-text transcript (`{ text, isFinal: false }`).
4. `transcript-final` / `voice:transcript:final`: Finalized speech-to-text transcript (`{ text, isFinal: true, confidence, isUncertain }`).
5. `agent-thinking` / `voice:agent:thinking`: Signals LLM inference start (`{ turnId }`).
6. `agent-response-text` / `voice:agent:text`: Text of AI clinical response (`{ text, turnId }`).
7. `audio-chunk` / `voice:audio:chunk`: ArrayBuffer audio chunk for Web Audio API playback.
8. `voice:audio:ack`: Frame delivery acknowledgement.
9. `voice:barge_in:ack`: Confirmation that server aborted active speech and cancelled upstream turn.
10. `voice:session:resumed`: Reconnection confirmation.
11. `voice:session:resume_failed`: Reconnection failure (`{ code, message }`).
12. `voice:error`: Pipeline error notification (`{ code, message }`).
13. `voice:session:aborted`: Emergency safety net preemption or consent revocation.
14. `session-ended` / `voice:session:ended`: Finalization confirmation.

---

## 10. Gaps & Smallest Compatible Solutions

| Gap ID | Identified Missing / Unverified Backend Feature | Impact on Frontend Brief | Proposed Smallest Compatible Solution (No Backend Code Changes) |
| :--- | :--- | :--- | :--- |
| **GAP-01** | **Caregiver Portal Production Status** | Brief requires caregiver views, but specifies "PLANNED badge on every frame". | Bind views to existing Phase 8 `/api/v1/caregiver/*` routes, but affix a permanent high-contrast `[PLANNED]` badge and banner to every caregiver screen. |
| **GAP-02** | **Notification Delivery Verification** | `CheckInComplete.jsx` claims "doctor has been notified" without verifying backend `EscalationEvent` status. | Replace with neutral confirmation copy: *"Your check-in has been recorded and saved to your chart."* Only show notification notices when backend provides delivery evidence. |
| **GAP-03** | **Report Version Compare (Diff)** | Brief requires visual diff compare between report versions, but no `/reports/:id/compare` REST endpoint exists. | Fetch both report versions via existing `GET /api/v1/reports/:id` and compute client-side visual diff across the 8 standard report sections. |
| **GAP-04** | **Organization Admin Interface** | Organization admin routes (`/api/v1/organizations/:id/teams`, `/admin/queues/health`) exist on backend, but lack frontend pages. | Implement an Admin Workspace (`/admin/organization`) consuming existing backend REST APIs. |
| **GAP-05** | **Dynamic Care Team Directory** | `PatientDoctors.jsx` uses hardcoded static array of 4 fake doctors. | Query active clinic clinicians via `/organizations/:id/memberships` or render an honest empty state: *"No assigned specialists found."* |
| **GAP-06** | **Appointment Booking Staff Selection** | Booking modal in `PatientAppointments.jsx` hardcodes static doctor options. | Dynamically populate doctor dropdown from active organization clinicians or provide a general consultation request inquiry form. |
