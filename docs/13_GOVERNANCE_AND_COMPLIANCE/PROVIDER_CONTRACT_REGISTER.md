# Companio External Provider & BAA Contract Register

## Document Purpose
Tracks the contractual and HIPAA Business Associate Agreement (BAA) standing of every third-party external vendor receiving voice, clinical text, or notification metadata from Companio.

## Scope
Covers AssemblyAI, Google Cloud / Gemini, ElevenLabs, Twilio, Resend, and host infrastructure assumptions.

## Status
- **Executed Vendor BAAs:** `0 / 5` (`BLOCKED`)
- **Historical Tracker:** [docs/15_PHASE_REPORTS/PHASE_12_1_PROVIDER_CONTRACT_REGISTER.md](../15_PHASE_REPORTS/PHASE_12_1_PROVIDER_CONTRACT_REGISTER.md) & [PHASE_12_2_PROVIDER_CLOSURE.md](../15_PHASE_REPORTS/PHASE_12_2_PROVIDER_CLOSURE.md)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [docs/15_PHASE_REPORTS/PHASE_12_1_PROVIDER_CONTRACT_REGISTER.md](../15_PHASE_REPORTS/PHASE_12_1_PROVIDER_CONTRACT_REGISTER.md)
- [docs/15_PHASE_REPORTS/PHASE_12_2_PROVIDER_CLOSURE.md](../15_PHASE_REPORTS/PHASE_12_2_PROVIDER_CLOSURE.md)
- [PROVIDER_VERIFICATION_MATRIX.md](../10_INTEGRATIONS/PROVIDER_VERIFICATION_MATRIX.md)

---

## 1. Vendor BAA & Compliance Ledger

| Vendor | Capability | Data Egress Sensitivity | Technical Safeguard | Executed BAA Status | Release Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AssemblyAI** | Live Streaming STT | Raw 16kHz senior speech frames | Ephemeral WebSocket (`AUDIO_RETENTION_MODE=disabled`) | `BLOCKED` / Pending | Blocks Tier C & D live PHI |
| **Google Cloud / Gemini** | Check-in LLM & Narration | Conversation turns / report summaries | Enterprise GCP Vertex AI BAA required (free/standard AI Studio keys insufficient) | `BLOCKED` / Pending | Blocks Tier C & D live PHI |
| **ElevenLabs** | Neural TTS (`eleven_turbo_v2_5`) | Agent spoken clinical text prompts | Memory streaming (`audio/mpeg`) | `BLOCKED` / Pending | Blocks Tier C & D live PHI |
| **Twilio** | Clinical Escalation & Reminder SMS | Destination clinician phone + zero-PHI opaque template | `createZeroPhiNotificationPayload` + `auditOutboundPayload` | `BLOCKED` / Pending | Blocks production SMS PHI/routing |
| **Resend** | Escalation & Transactional Email | Destination email + zero-PHI opaque link / invite token | `createZeroPhiNotificationPayload` + `auditOutboundPayload` | `BLOCKED` / Pending | Blocks production email launch |

---

## 2. Related Documentation
- [DATA_PRIVACY_MAP.md](../09_SECURITY_AND_PRIVACY/DATA_PRIVACY_MAP.md)
- [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md)
