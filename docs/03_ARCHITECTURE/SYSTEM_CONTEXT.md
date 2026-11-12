# Companio — C4 System Context Diagram & Boundary Map

**Document Purpose:** Provide a C4 Level-1 System Context view illustrating human actors, trust boundaries, internal systems, and external third-party providers.  
**Scope:** External actors, internal platform, and contractual provider boundaries.  
**Status:** `IMPLEMENTED (EXTERNAL PROVIDERS BLOCKED FOR LIVE PHI WITHOUT BAAs)`  
**Owner Category:** Architecture  
**Last Verified Date:** 2026-11-12  
**Relevant Source Files:** [`server/src/server.js`](../../server/src/server.js), [`docker-compose.yml`](../../docker-compose.yml), [`docs/13_GOVERNANCE_AND_COMPLIANCE/PROVIDER_CONTRACT_REGISTER.md`](../13_GOVERNANCE_AND_COMPLIANCE/PROVIDER_CONTRACT_REGISTER.md)

---

## 1. C4 System Context Diagram

```mermaid
flowchart TB
    Patient(["Patient (55+ Adult)<br/>Voice Check-ins & Personal Chart"])
    Clinician(["Clinician / Care Coordinator<br/>Triage, Observations, Reports & Attestation"])
    Caregiver(["Authorized Caregiver<br/>Scoped Summaries & Concerns"])
    Admin(["Organization Admin / Auditor<br/>Tenants, Teams, Queues & Audits"])

    Companio["Companio Modular Monolith + React SPA + BullMQ Workers<br/>[SYNTHETIC DATA MODE ONLY]"]

    AAI["AssemblyAI Streaming STT<br/>WebSocket 16kHz PCM -> Text<br/>[BAA BLOCKED]"]
    Gemini["Google Gemini LLM<br/>Dialogue & Validated Narration<br/>[BAA BLOCKED]"]
    EL["ElevenLabs TTS<br/>Turbo v2.5 Voice Synthesis<br/>[BAA BLOCKED]"]
    Twilio["Twilio SMS Gateway<br/>Zero-PHI Opaque Alerts Only<br/>[BAA BLOCKED]"]
    Resend["Resend Email Relay<br/>Zero-PHI Opaque Alerts Only<br/>[BAA BLOCKED]"]
    Webhook["Operator Alert Webhook / Prometheus Scraper<br/>Zero-PHI Operational Telemetry"]

    Patient -->|"HTTPS + Socket.IO /voice (16kHz PCM)"| Companio
    Clinician -->|"HTTPS + Socket.IO /voice (Triage Rooms)"| Companio
    Caregiver -->|"HTTPS /api/v1/caregiver/*"| Companio
    Admin -->|"HTTPS /api/v1/organizations & /admin/*"| Companio

    Companio -->|"Raw Audio Stream (Biometric)"| AAI
    Companio -->|"De-identified Context"| Gemini
    Companio -->|"Speech Text Script"| EL
    Companio -->|"Fail-Closed ALERT_REF_XXXXXX"| Twilio
    Companio -->|"Fail-Closed ALERT_REF_XXXXXX"| Resend
    Companio -.->|"Zero-PHI Health Metrics (/metrics)"| Webhook
```

---

## 2. Trust Boundaries & Governance Status

| Boundary Crossing | Protocol & Payload | Governance Constraint |
| :--- | :--- | :--- |
| **Client <-> Server** | HTTPS REST (`/api/v1`) + Socket.IO (`/voice`) with JWT & `X-Organization-Id` | Enforce TLS termination at reverse proxy/load balancer in deployment |
| **Server <-> AssemblyAI** | WSS binary 16kHz PCM audio | Biometric voice data under HIPAA; requires signed BAA prior to live human use |
| **Server <-> Google Gemini** | HTTPS REST JSON dialogue turns & analytics summary | Patient profiles generalized (`safeHarborAgeCategory`); zero-retention enterprise BAA required |
| **Server <-> ElevenLabs** | HTTPS streaming TTS JSON text | Only system-phrased speech strings sent; `AbortSignal` interrupts stream on barge-in |
| **Server <-> Twilio & Resend** | HTTPS REST Zero-PHI tokenized payloads | Fail-closed `auditOutboundPayload` blocks any residual PHI or raw ObjectId |

## 3. Related Documentation
- [System Architecture](ARCHITECTURE.md)
- [System Components](SYSTEM_COMPONENTS.md)
- [Provider Contract Register](../13_GOVERNANCE_AND_COMPLIANCE/PROVIDER_CONTRACT_REGISTER.md)
