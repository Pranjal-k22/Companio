# Companio

**Voice-first health and wellness check-ins for adults aged 55+**

Companio is a healthcare-support platform that helps older adults complete voice-led daily and weekly wellness check-ins. It structures patient-reported observations, applies a deterministic safety rules layer, supports clinician review and reporting, and provides controlled caregiver participation.

> **Clinical boundary:** Companio is a clinician-support and wellness tool. It does not diagnose, prescribe, change treatment, approve care plans autonomously, dispatch emergency services, or replace professional clinical judgment.

> **Release status:** The repository's current readiness records authorize synthetic-data engineering and testing. Human recruitment, controlled clinical pilot and commercial production remain gated by external ethics, clinical, contractual and independent security approvals. See [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md).

## Product capabilities

- Patient-facing voice check-ins with speech-to-text, conversational dialogue, spoken responses and accessible controls.
- Consent-aware voice session lifecycle and structured observation capture.
- Deterministic RED/YELLOW safety screening alongside the conversational workflow.
- Clinician triage, longitudinal patient context, clinical report generation and clinician attestation.
- Patient-authorized caregiver access with granular scopes, audit events and revocation.
- MongoDB-backed persistence and Redis/BullMQ background jobs for escalations, reminders, reports and notifications.
- Operational health endpoints, metrics and queue administration.

Implemented capabilities and external deployment authorization are separate questions. Consult the project documentation and current release matrix before relying on any feature in a live setting.

## Technology stack

The following technologies are reflected in the current root/server/client package manifests and inspected source:

| Layer | Technologies |
|---|---|
| Frontend | React 18, Vite, React Router, Tailwind CSS, Recharts, Axios |
| Real-time client | Socket.IO client, Web Audio API / AudioWorklet |
| Backend | Node.js (ES modules), Express 4, Socket.IO |
| Data | MongoDB, Mongoose |
| Authentication and validation | JWT, bcryptjs, Zod |
| Voice and AI integrations | AssemblyAI, Google Generative AI (Gemini), ElevenLabs |
| Notifications | Twilio, Resend |
| Background processing | BullMQ, Redis via ioredis |
| Operations | Docker, Docker Compose, Prometheus-style metrics |

Package presence does not prove a provider credential is valid, a production integration is enabled, or a provider is contractually approved to process PHI.

## Repository structure

```text
Companio/
├── client/                 # React + Vite application
├── server/                 # Express, Socket.IO, models, services and workers
├── docs/                   # Product, architecture, API, clinical, privacy and phase docs
├── UI/                     # UI assets and/or design references (inspect before use)
├── Dockerfile.client
├── Dockerfile.server
├── docker-compose.yml
├── .env.example             # Placeholder configuration; never store live credentials here
├── package.json             # Monorepo scripts
├── start-demo.bat
├── start-demo.sh
├── README.md
├── AI_AGENTS.md
├── CONTRIBUTING.md
└── SECURITY.md
```

Start with the [documentation index](docs/README.md) and [documentation index catalogue](docs/DOCUMENTATION_INDEX.md).

## Prerequisites

For the documented deployment baseline, use:
- Node.js 20.x or 22.x LTS.
- npm.
- MongoDB (local instance or an approved managed environment).
- Redis for BullMQ-backed distributed jobs.
- Docker and Docker Compose if using the container configuration.

Provider API credentials are optional for some local paths but are required for the corresponding live provider integrations. Do not use real patient information with a provider unless the exact service and configuration have been reviewed and approved for that use.

## Local development setup

### 1. Install dependencies

From the repository root:

```bash
npm run install:all
```

### 2. Configure local environment

Use the tracked template as a starting point:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then:
- Replace any development JWT secret with a newly generated, high-entropy local secret.
- Keep `AUDIO_RETENTION_MODE=disabled` unless a separately approved retention design and authorization exist.
- Configure only the provider credentials needed for the local synthetic-data workflow.
- Do not commit `.env`, API keys, tokens or certificates.
- Verify actual runtime requirements in [CONFIGURATION.md](docs/CONFIGURATION.md) and `server/src/config/envValidator.js`. Some old variables in the template may be compatibility leftovers; source configuration is authoritative.

### 3. Start MongoDB and Redis

Start local MongoDB and Redis services using your local development setup, or inspect the repository's `docker-compose.yml` before using it. The Compose file sets `NODE_ENV=production` for its application services and contains fallback values that must not be used as production secrets. Treat the Compose topology as an evaluation/development aid unless it has been separately hardened and approved.

### 4. Start the application

From the repository root:

```bash
npm run dev
```

The root script starts server and client processes concurrently. The checked-in launcher scripts `start-demo.bat` and `start-demo.sh` still contain legacy provider checks and static demo credential output; inspect and update them before relying on them. Do not use credentials printed by old launcher scripts outside an isolated local synthetic demo.

Common local addresses recorded by the project:
- Vite client: `http://localhost:5173`
- Express API: `http://localhost:5000`

Actual ports depend on local environment configuration.

## Useful commands

Run from the repository root:

| Command | Purpose |
|---|---|
| `npm run dev` | Start frontend and backend in development |
| `npm run dev:server` | Start backend only |
| `npm run dev:client` | Start frontend only |
| `npm run seed` | Run server seeder |
| `npm run build:client` | Build the Vite client |
| `npm run test:voice` | Voice gateway tests |
| `npm run test:safety` | Clinical safety tests |
| `npm run test:dialogue` | Dialogue tests |
| `npm run test:reporting` | Reporting and attestation tests |
| `npm run test:caregivers` | Caregiver tests |
| `npm run test:jobs` | Background job tests |
| `npm run test:redis` | Real Redis verification (requires a running Redis service) |
| `npm run test:operations` | Operational and release-gate tests |
| `npm run test:drill` | Backup/restore drill (use isolated test data and services) |
| `npm run test:recovery` | Password recovery tests |
| `npm run test:pilot` | Synthetic end-to-end pilot tests |
| `npm run test:deid` | Pilot-safe de-identification tests |
| `npm run check:contrast` | Frontend color-contrast check |

Run tests with synthetic fixtures and isolated test services. A command's existence does not mean the test was run in your environment. Record exact results and distinguish mocked tests from real infrastructure tests.

## API and voice architecture

The backend centralizes route registration in `server/src/routes/index.js`. The registry documents versioned `/api/v1` routes and a backward-compatible `/api` alias. Voice interaction uses the Socket.IO gateway and the voice lifecycle components documented under [docs/](docs/README.md).

See:
- [Architecture](docs/ARCHITECTURE.md)
- [API reference](docs/API_REFERENCE.md)
- [Voice session state machine](docs/VOICE_SESSION_STATE_MACHINE.md)
- [Clinical safety architecture](docs/CLINICAL_SAFETY_ARCHITECTURE.md)
- [Caregiver architecture](docs/CAREGIVER_PORTAL_ARCHITECTURE.md)

## Privacy, security and clinical limitations

- Use synthetic data for development and automated testing.
- Do not transmit real PHI to a provider unless the exact service, account configuration, contract and applicable legal requirements have been reviewed and approved.
- The current alert data scrubber is a heuristic data-minimization and pseudonymization layer. It is not a claim of independently certified HIPAA Safe Harbor or Expert Determination.
- Consent must be checked before applicable voice processing.
- Caregiver permissions must be enforced server-side and do not arise automatically from an emergency-contact relationship.
- Clinical flags must remain durable when notification delivery fails.
- Clinical reports require clinician review/attestation.
- Never treat software test results as clinical, legal, ethics or regulatory approval.

See [Security](SECURITY.md), [AI agent rules](AI_AGENTS.md), [privacy architecture](docs/CONSENT_AND_PRIVACY_ARCHITECTURE.md), [provider closure register](docs/PHASE_12_2_PROVIDER_CLOSURE.md) and [production readiness matrix](docs/PHASE_12_PRODUCTION_READINESS_MATRIX.md).

## Deployment

The repository includes `Dockerfile.server`, `Dockerfile.client` and `docker-compose.yml`. Read [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [docs/CONFIGURATION.md](docs/CONFIGURATION.md) before launching containers.

**Commercial production and live-patient deployment are not authorized by this README.** The current repository readiness documents record open external provider, independent security, clinical governance and ethics prerequisites. Use the four-tier readiness matrix for the current decision.

## Contributing and security

- Contribution process: [CONTRIBUTING.md](CONTRIBUTING.md)
- AI coding rules: [AI_AGENTS.md](AI_AGENTS.md)
- Security policy: [SECURITY.md](SECURITY.md)
- Full docs: [docs/README.md](docs/README.md)

## License

No repository license file or owner-approved license selection was verified during this documentation update. Do not assume a license based solely on package metadata; add a root `LICENSE` only after the repository owner explicitly selects one.
