# Caregiver Clinical Boundaries & Safety Rules

## Document Purpose
Establishes the strict clinical and legal separation between patient self-reporting, caregiver observations, and clinician authority inside Companio.

## Scope
Covers caregiver read-only clinical portals, `CAREGIVER_REPORTED` concern attribution, assisted voice check-in labeling, and deterministic red-flag escalation when caregivers submit urgent symptoms.

## Status
- **Backend & UI Controls:** `IMPLEMENTED` & `TESTED` (`npm run test:caregivers`)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/services/caregivers/caregiverConcernService.js](../../server/src/services/caregivers/caregiverConcernService.js)
- [server/src/services/caregivers/caregiverVoiceService.js](../../server/src/services/caregivers/caregiverVoiceService.js)
- [server/src/models/CaregiverConcern.js](../../server/src/models/CaregiverConcern.js)
- [server/src/models/DialogueSession.js](../../server/src/models/DialogueSession.js)

---

## 1. Core Clinical Boundaries for Caregivers

1. **Zero Prescription or Care-Plan Mutation:** Caregivers with `MEDICATION_SCHEDULE_READ` or `MEDICATION_ADHERENCE_READ` have strictly read-only views and cannot add, modify, or discontinue medications.
2. **Explicit `CAREGIVER_REPORTED` Attribution:** Concerns submitted via `POST /api/v1/caregiver/patients/:patientId/concerns` always record `sourceType: 'CAREGIVER_REPORTED'` and are never disguised as direct patient quotes.
3. **Emergency Safety Parity:** Caregiver concerns run through the same clinical safety net; acute descriptions (e.g., sudden weakness, chest pain, fall with injury) automatically raise RED `Flag` entries (`linkedFlagId`) and return emergency instructions.
4. **Transparent Voice Co-Session Provenance:** When a caregiver helps initiate a check-in (`VOICE_CHECKIN_ASSIST`), `DialogueSession.assistedByCaregiver` flags `{ isAssisted: true, caregiverUserId, caregiverRelationshipId, assistedAt }` so reviewing clinicians know a second person was present.

---

## 2. Related Documentation
- [CAREGIVER_OVERVIEW.md](../08_CAREGIVER_PORTAL/CAREGIVER_OVERVIEW.md)
- [CAREGIVER_PERMISSIONS.md](../08_CAREGIVER_PORTAL/CAREGIVER_PERMISSIONS.md)
- [CAREGIVER_VOICE_ASSISTANCE.md](../08_CAREGIVER_PORTAL/CAREGIVER_VOICE_ASSISTANCE.md)
