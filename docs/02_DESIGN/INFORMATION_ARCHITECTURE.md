# COMPANIO — UI/UX INFORMATION ARCHITECTURE
## Role-Based Sitemap, Navigation Hierarchies, Modal Topologies & Data Lifecycles

**Document Reference:** `docs/UI_UX_INFORMATION_ARCHITECTURE.md`  
**Milestone:** Frontend Redesign — Stage 0 Information Architecture  
**Author:** Principal Healthcare UX Architect & Lead Frontend Engineer  
**Evaluation Date:** 2026-11-04  

---

## 1. Information Architecture Overview

Companio's frontend is architected around four distinct user personas, each operating within strict role-based access control (RBAC), organization-scoped tenancy, and HIPAA privacy boundaries:

```
[Companio Healthcare Platform]
  │
  ├── 1. Patient Portal (Voice-first, senior-friendly, large-type, non-clinical tone)
  │      ├── Authentication & Consent Gateways
  │      ├── Daily / Weekly Voice Check-In (16-State Interactive Pipeline)
  │      ├── Read-Back Confirmation & Session Summary
  │      ├── Health Vitals & Observations History
  │      ├── Consultation Appointments & Scheduling
  │      ├── Pathology & Diagnostic Lab Panels
  │      ├── Authorized Family & Caregiver Scopes
  │      └── Preferences, Audio Cadence & Font Scaling
  │
  ├── 2. Clinician Workspace (Calm, high-density, evidence-based, traceable)
  │      ├── Urgent Triage Queue (RED/YELLOW flags sorted by acuity & SLA)
  │      ├── Patient Roster & Care Team Assignment
  │      ├── Patient Longitudinal Chart (Tabs: Summary, Trends, Flags, Reports, History)
  │      ├── Flag Resolution Dialog (Mandatory clinical rationale & timestamp)
  │      ├── Weekly Clinical Reports & Version Comparison Diff
  │      ├── Cryptographic Clinician Attestation (ECDSA-SHA256 signature)
  │      ├── Consultation Schedule & Telehealth Telephony
  │      └── Voice Session Audit Logs & Telemetry
  │
  ├── 3. Organization Admin Portal (Governance, compliance & team provisioning)
  │      ├── Organization Profile & Clinic Configuration
  │      ├── Staff Memberships & Team Assignment
  │      ├── Role & Permission Catalog (28 granular permissions)
  │      └── System Health, Queue Telemetry & Audit Logs
  │
  └── 4. Caregiver & Family Portal [PLANNED BADGE ON EVERY FRAME]
         ├── Linked Senior Loved One Dashboard
         ├── Assisted Voice Check-in (with mandatory patient assent)
         ├── Shared Calendar & Upcoming Appointments
         ├── Non-Diagnostic Caregiver Concern Submission
         └── Alert & Notification Preferences
```

---

## 2. Complete Role-Based Sitemap & Route Mapping

### 2.1 Patient Experience (`/patient/*`)
*Primary Objective:* Provide older adults (55+) with a low-friction, empathetic, voice-interactive check-in tool requiring zero manual typing.

```
/login (Public)
  │
  ├──> [First Time] /patient/consent (Granular Tier-1, Tier-2, Tier-3 consents)
  │
  └──> /patient/home (Health Overview & Primary Voice Action)
         │
         ├──> /patient/voice-checkin (16-State VoiceOrb Modal/View)
         │      │
         │      ├──> /patient/checkin-confirm (Verbal / Tap Read-Back Confirmation)
         │      │
         │      └──> /patient/checkin-complete (Honest Confirmation & Follow-up Notice)
         │
         ├──> /patient/appointments (Upcoming Consultations & In-Person Booking)
         ├──> /patient/pathology (Certified Diagnostic Lab Panels)
         ├──> /patient/caregivers (Caregiver Invitation, Granular Scopes & Revocation)
         ├──> /patient/doctors (Assigned Primary Care & Specialists)
         └──> /patient/settings (Theme, Font Size 100/125/150%, Voice Cadence 0.8x-1.2x)
```

### 2.2 Clinician Experience (`/clinician/*`)
*Primary Objective:* Surface critical patient changes instantly without burying clinicians in raw audio or unstructured text.

```
/clinician/dashboard
  ├── Tab 1: [Triage Queue] (Immediate RED flags <15m SLA, YELLOW alerts, Ack/Resolve)
  ├── Tab 2: [Patient Roster] (Alphabetical & Risk-sorted patient directory, search, filter)
  └── Tab 3: [Clinical Reports] (Weekly draft reports pending review, signed reports)
         │
         └──> /clinician/patient/:patientId (Longitudinal Patient Chart)
                ├── Tab 1: Clinical Overview & Vitals Trends (Recharts Line/Bar)
                ├── Tab 2: Observations & LOINC Extraction History
                ├── Tab 3: Active Flags, Escalation Audit & Resolution Dialog
                ├── Tab 4: Weekly Retrospective Reports & Version Compare Diff
                │     └──> Modal: Attestation Dialog (ECDSA-SHA256 signature sign-off)
                ├── Tab 5: Check-in Dialogue History & Transcripts
                └── Tab 6: Caregiver Scopes & Permission Grants
```

### 2.3 Organization Admin Experience (`/admin/*`)
*Primary Objective:* Manage clinic staff, tenant settings, and platform observability.

```
/admin/organization
  ├── Clinic Details & Legal Identification (NPI, Tax ID)
  ├── Care Teams & Staff Memberships
  ├── Queue Health & Redis Status (/api/v1/admin/queues/health)
  └── Operational Audit Logs & Prometheus Telemetry
```

### 2.4 Caregiver Experience (`/caregiver/*`) [PLANNED BADGE ENFORCED]
*Primary Objective:* Allow family members to support aging parents without unrestricted access to clinical records.

```
/caregiver/dashboard [PLANNED]
  ├── /caregiver/patient/:patientId [PLANNED] (Wellness summary only; zero clinical notes)
  ├── /caregiver/checkins [PLANNED] (Assisted check-in trigger with patient transparent alert)
  ├── /caregiver/appointments [PLANNED] (View upcoming clinic schedule)
  ├── /caregiver/concerns [PLANNED] (Submit non-clinical observation: e.g. "Mom skipped breakfast")
  └── /caregiver/notifications [PLANNED] (SMS/Email notification toggles)
```

---

## 3. Modal & Overlay Hierarchy

To preserve cognitive clarity and comply with accessibility focus-trapping mandates:

1. **Voice Check-in Overlay**:
   - Takes full viewport control or dedicated route (`/patient/voice-checkin`).
   - High-contrast VoiceOrb centered with live streaming captions below.
   - Large physical touch controls (Stop, Mute, Repeat Prompt, Text View).
2. **Flag Resolution Dialog (Clinician)**:
   - Accessible modal with keyboard focus trap (`role="dialog"`).
   - Displays flag category, detection source (LLM tool vs Deterministic keyword net), timestamp, and verbatim patient quote.
   - Requires mandatory written clinical rationale before button activates.
3. **Attestation & Cryptographic Signing Modal (Clinician)**:
   - Displays exact report version hash (SHA-256), clinician name, NPI, and statutory 21 CFR Part 11 legal attestation statement.
   - Double-confirmation before permanent signature write.
4. **Caregiver Invitation & Scope Configuration Modal (Patient)**:
   - Plain-English checklist of 8 granular permissions.
   - Single-use invite link generation with expiration countdown.

---

## 4. Theme & Layout Invariants

- **Layout Structure**:
  - Desktop: Collapsible sidebar (64px collapsed, 256px expanded) + Fixed Header (80px) + Responsive Content Container.
  - Tablet (768px – 1024px): 8-column grid with generous 16px gutters; bottom navigation bar for patient mode.
  - Mobile (390px): 4-column layout; minimum 56px touch targets; hamburger menu or bottom bar.
- **Theme Switching**:
  - Persisted per user in `localStorage` (`companio_theme`).
  - Applied on root `<html>` element before initial paint to prevent theme flashing.
  - Smooth 250ms cross-fade between Day and Night; instantaneous under `prefers-reduced-motion`.

---

## 5. Master Route Map & Navigation Architecture

Every route is bound to a dedicated layout, strict RBAC guard, and accessible navigation container:

| URL Path | Target Page Component | Layout Used | Allowed Roles | Nav Placement | Guard Enforcement |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/login` | `Login.jsx` | Standalone (Clean) | `Public` | None | Public |
| `/register` | `Register.jsx` | Standalone (Clean) | `Public` | None | Public |
| `/design-system` | `DesignSystemShowcase.jsx` | Standalone (Dev) | `Dev / Public` | Excluded from prod nav | Public / Dev-only |
| `/patient/home` | `PatientHome.jsx` | `PatientLayout` | `PATIENT` | Bottom Nav Item 1 ("Home") | `ProtectedRoute(['PATIENT'])` |
| `/patient/voice-checkin` | `VoiceCheckIn.jsx` | `PatientLayout` | `PATIENT` | Bottom Nav Item 2 ("Check-in", Prominent Voice Button) | `ProtectedRoute(['PATIENT'])` |
| `/patient/pathology` | `PatientPathology.jsx` | `PatientLayout` | `PATIENT` | Bottom Nav Item 3 ("History") | `ProtectedRoute(['PATIENT'])` |
| `/patient/appointments` | `PatientAppointments.jsx` | `PatientLayout` | `PATIENT` | Bottom Nav Item 4 ("Appts") | `ProtectedRoute(['PATIENT'])` |
| `/patient/settings` | `PatientSettings.jsx` | `PatientLayout` | `PATIENT` | Bottom Nav Item 5 ("More" Drawer) | `ProtectedRoute(['PATIENT'])` |
| `/patient/caregivers` | `PatientCaregiverAccess.jsx` | `PatientLayout` | `PATIENT` | "More" Drawer | `ProtectedRoute(['PATIENT'])` |
| `/patient/doctors` | `PatientDoctors.jsx` | `PatientLayout` | `PATIENT` | "More" Drawer | `ProtectedRoute(['PATIENT'])` |
| `/patient/checkin-complete` | `CheckInComplete.jsx` | `PatientLayout` | `PATIENT` | Post-session redirect | `ProtectedRoute(['PATIENT'])` |
| `/clinician/dashboard` | `ClinicianDashboard.jsx` (initialTab="triage") | `ClinicianLayout` | `CLINICIAN`, `ADMIN` | Sidebar Item 1 ("Triage") | `ProtectedRoute(['CLINICIAN', 'ADMIN'])` |
| `/clinician/patients` | `ClinicianDashboard.jsx` (initialTab="roster") | `ClinicianLayout` | `CLINICIAN`, `ADMIN` | Sidebar Item 2 ("Patients") | `ProtectedRoute(['CLINICIAN', 'ADMIN'])` |
| `/clinician/reports` | `ClinicianDashboard.jsx` (initialTab="reports") | `ClinicianLayout` | `CLINICIAN`, `ADMIN` | Sidebar Item 3 ("Reports") | `ProtectedRoute(['CLINICIAN', 'ADMIN'])` |
| `/clinician/flags` | `ClinicianDashboard.jsx` (initialTab="triage") | `ClinicianLayout` | `CLINICIAN`, `ADMIN` | Sidebar Item 6 ("Flags") | `ProtectedRoute(['CLINICIAN', 'ADMIN'])` |
| `/clinician/appointments` | `ClinicianAppointments.jsx` | `ClinicianLayout` | `CLINICIAN`, `ADMIN` | Sidebar Item 4 ("Appointments") | `ProtectedRoute(['CLINICIAN', 'ADMIN'])` |
| `/clinician/voice-logs` | `ClinicianVoiceLogs.jsx` | `ClinicianLayout` | `CLINICIAN`, `ADMIN` | Sidebar Item 5 ("Voice Logs") | `ProtectedRoute(['CLINICIAN', 'ADMIN'])` |
| `/clinician/team` | `ClinicianTeam.jsx` | `ClinicianLayout` | `CLINICIAN`, `ADMIN` | Sidebar Item 7 ("Team" - Authorized only) | `ProtectedRoute(['CLINICIAN', 'ADMIN'])` |
| `/clinician/settings` | `ClinicianSettings.jsx` | `ClinicianLayout` | `CLINICIAN`, `ADMIN` | Sidebar Item 8 ("Settings") | `ProtectedRoute(['CLINICIAN', 'ADMIN'])` |
| `/clinician/patient/:id` | `PatientDetail.jsx` | `ClinicianLayout` | `CLINICIAN`, `ADMIN` | Patient Drill-down | `ProtectedRoute(['CLINICIAN', 'ADMIN'])` |
| `/admin/organization` | `AdminOrganization.jsx` | `OrganizationAdminLayout` | `ADMIN` | Admin Sidebar Item 2 ("Organization") | `ProtectedRoute(['ADMIN'])` |
| `/admin/dashboard` | `AdminOrganization.jsx` | `OrganizationAdminLayout` | `ADMIN` | Admin Sidebar Item 1 ("Overview") | `ProtectedRoute(['ADMIN'])` |
| `/admin/audit-logs` | `AdminOrganization.jsx` | `OrganizationAdminLayout` | `ADMIN` | Admin Sidebar Item 4 ("Audit") | `ProtectedRoute(['ADMIN'])` |
| `/admin/integrations` | `AdminOrganization.jsx` | `OrganizationAdminLayout` | `ADMIN` | Admin Sidebar Item 5 ("Integrations") | `ProtectedRoute(['ADMIN'])` |
| `/caregiver/dashboard` | `CaregiverDashboard.jsx` | `CaregiverLayout` [PLANNED] | `CAREGIVER` | Caregiver Nav Item 1 | `ProtectedRoute(['CAREGIVER'])` |
| `/caregiver/checkins` | `CaregiverCheckins.jsx` | `CaregiverLayout` [PLANNED] | `CAREGIVER` | Caregiver Nav Item 2 | `ProtectedRoute(['CAREGIVER'])` |
| `/caregiver/appointments` | `CaregiverAppointments.jsx` | `CaregiverLayout` [PLANNED] | `CAREGIVER` | Caregiver Nav Item 3 | `ProtectedRoute(['CAREGIVER'])` |
| `/caregiver/concerns` | `CaregiverConcerns.jsx` | `CaregiverLayout` [PLANNED] | `CAREGIVER` | Caregiver Nav Item 4 | `ProtectedRoute(['CAREGIVER'])` |
| `/caregiver/notifications` | `CaregiverNotifications.jsx` | `CaregiverLayout` [PLANNED] | `CAREGIVER` | Caregiver Nav Item 5 | `ProtectedRoute(['CAREGIVER'])` |

---

## 6. Granular Role-to-Route Permission Matrix

| Route Category | Public / Unauthenticated | Patient Role | Clinician Role | Org Admin Role | Caregiver Role (Staged) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Public Auth** (`/login`, `/register`) | ✅ ALLOW | ➡️ Redirect `/patient/home` | ➡️ Redirect `/clinician/dashboard` | ➡️ Redirect `/clinician/dashboard` | ➡️ Redirect `/caregiver/dashboard` |
| **Dev Showcase** (`/design-system`) | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW |
| **Patient Portal** (`/patient/*`) | 🔒 Redirect `/login` | ✅ ALLOW | 🚫 403 Forbidden | 🚫 403 Forbidden | 🚫 403 Forbidden |
| **Clinician Core** (`/clinician/dashboard`, `/clinician/patients`, `/clinician/reports`, `/clinician/flags`, `/clinician/patient/:id`) | 🔒 Redirect `/login` | 🚫 403 Forbidden | ✅ ALLOW | ✅ ALLOW | 🚫 403 Forbidden |
| **Clinician Operations** (`/clinician/appointments`, `/clinician/voice-logs`, `/clinician/settings`) | 🔒 Redirect `/login` | 🚫 403 Forbidden | ✅ ALLOW | ✅ ALLOW | 🚫 403 Forbidden |
| **Clinical Team Management** (`/clinician/team`) | 🔒 Redirect `/login` | 🚫 403 Forbidden | 🛡️ Conditional (Lead/Admin) | ✅ ALLOW | 🚫 403 Forbidden |
| **Tenant Admin Portal** (`/admin/*`) | 🔒 Redirect `/login` | 🚫 403 Forbidden | 🚫 403 Forbidden | ✅ ALLOW | 🚫 403 Forbidden |
| **Caregiver Portal** (`/caregiver/*`) [PLANNED] | 🔒 Redirect `/login` | 🚫 403 Forbidden | 🚫 403 Forbidden | 🚫 403 Forbidden | ✅ ALLOW (When activated) |

---

## 7. Keyboard Navigation & Focus Order Protocol

1. **PatientLayout Focus Flow**:
   - `Tab 1`: Skip to main content (if triggered) / Brand logo.
   - `Tab 2`: Emergency 911 quick trigger.
   - `Tab 3`: Text size toggle (Desktop).
   - `Tab 4`: Theme toggle.
   - `Tab 5`: Sign out button.
   - `Tab 6 - N`: Main interactive page content (e.g. Start Check-in button, appointments list).
   - `Tab Last`: Sticky bottom navigation buttons (`Home` -> `Check-in` -> `History` -> `Appts` -> `More`).
2. **ClinicianLayout Focus Flow**:
   - `Tab 1`: Brand logo link.
   - `Tab 2`: Sidebar collapse/expand button.
   - `Tab 3 - 10`: Sequential sidebar navigation links with visual active indicator.
   - `Tab 11`: Organization Switcher dropdown.
   - `Tab 12`: Top bar search input.
   - `Tab 13`: Theme toggle.
   - `Tab 14`: Notifications button.
   - `Tab 15 - N`: Clinical table / triage cards.
3. **Modal Dialog Focus Trap**:
   - Traps keyboard focus inside dialog boundaries.
   - Closes on `Escape` key and restores focus to triggering button.


