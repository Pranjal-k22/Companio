# Companio Project Overview

**Owner category:** Product and Engineering  
**Status:** Current summary based on repository documents and inspected source files  
**Last verified:** 2026-11-12

## Product purpose

Companio is a voice-first health and wellness check-in platform designed for adults aged 55+. It supports natural spoken check-ins, structured wellness observations, deterministic safety screening, clinician-facing summaries and controlled caregiver participation.

Companio is a clinician-support and wellness tool. It is not an autonomous diagnosis, treatment, prescribing, emergency dispatch or substitute-for-care system.

## Primary user groups

- **Patient:** completes daily or weekly voice-led wellness check-ins, reviews appropriate summaries and controls consent.
- **Clinician:** reviews patient observations, flags, escalation status and reports; clinical decisions remain with qualified professionals.
- **Organization administrator:** manages organization membership, roles and operational configuration.
- **Caregiver:** participates only through explicit patient-authorized or appropriately verified legal authority and granular grants.

The backend User model includes roles PATIENT, CLINICIAN, ADMIN and CAREGIVER. The frontend App source includes patient, clinician, organization-admin and caregiver layouts/pages.

## Main capabilities

| Capability | Evidence inspected | Status |
|---|---|---|
| Patient voice check-in | Client voice pages, Socket.IO server and voice services | Implemented |
| Consent records | ConsentRecord model and consent services | Implemented |
| Structured observations | Observation model and observation routes | Implemented |
| Deterministic safety rules | Safety engine, taxonomy and flags | Implemented; clinical sign-off separately pending |
| Clinical reporting | Report model, reporting architecture and attestation docs | Implemented; clinician review required |
| Caregiver delegation | Caregiver models, routes, grant service and portal pages | Implemented |
| Distributed jobs | BullMQ queue manager, seven queue definitions and workers | Implemented; live availability is environment-dependent |
| Outbound privacy minimization | De-identification service and escalation dispatcher | Heuristic minimization/pseudonymization; not certified de-identification |

## High-level architecture

Patient, clinician, caregiver and admin UIs connect to the Express REST API and Socket.IO voice gateway. MongoDB persists application data; deterministic safety and reporting services process structured records; an escalation outbox feeds BullMQ/Redis workers; configured AI and messaging integrations support voice and notifications.

See [ARCHITECTURE.md](ARCHITECTURE.md) for documented topology and inspect implementation modules before making architecture changes.

## Technology stack verified in package manifests

- Frontend: React 18, Vite, React Router, Tailwind CSS, Recharts, Axios, Socket.IO client.
- Backend: Node.js ESM, Express 4, Socket.IO, Mongoose, MongoDB, JWT, bcryptjs, Zod.
- Voice/AI dependencies: AssemblyAI SDK, Google Generative AI SDK, ElevenLabs SDK.
- Messaging: Twilio and Resend SDKs.
- Jobs: BullMQ and ioredis.
- Operations: Dockerfiles, Docker Compose and Vite client build.

Package manifests prove dependency presence, not successful production integration or legal approval.

## Safety and privacy boundaries

- No autonomous diagnosis, prescribing, medication adjustment or clinical plan approval.
- Clinical reports remain subject to clinician review and attestation.
- Consent controls applicable voice and processing purposes.
- Caregiver access is explicit, granular and revocable.
- Emergency-contact status alone does not establish authorization.
- The de-identification service is heuristic; it is not proof of HIPAA Safe Harbor or Expert Determination.
- See [PROJECT_STATUS.md](PROJECT_STATUS.md) for external deployment restrictions.