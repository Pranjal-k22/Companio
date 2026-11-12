# Companio — Architecture Decision Records (ADR-001 to ADR-010)

**Document Purpose:** Record the major architectural decisions implemented across Companio, including rationale, code location, and trade-offs.  
**Scope:** Core platform architecture (`ADR-001` through `ADR-010`).  
**Status:** `VERIFIED`  
**Owner Category:** Architecture  
**Last Verified Date:** 2026-11-12  
**Relevant Source Files:** [`server/src/`](../../../server/src/server.js), [`client/src/`](../../../client/src/App.jsx)

---

## ADR-001: Multi-Tenant Modular Monolith with Discriminator Scoping (`organizationId`)
- **Status:** Accepted / Implemented (Phase 2)
- **Decision:** Use shared Node.js/MongoDB infrastructure with strict `organizationId` document scoping enforced by `tenantContext` middleware (`server/src/middleware/tenantContext.js`) and compound indexes. Conceal cross-tenant entities behind HTTP `404` rather than `403`.
- **Trade-Off:** Low operational overhead compared to per-tenant databases, at the cost of requiring strict developer discipline on every Mongoose query filter.

## ADR-002: Migration from Deepgram to AssemblyAI Streaming STT (`9b766ad`)
- **Status:** Accepted / Implemented
- **Decision:** Replaced initial Deepgram streaming integration with AssemblyAI `RealtimeTranscriber` (`16000Hz` PCM, `endUtteranceSilenceThreshold: 900ms`) in `server/src/services/voice/stt/assemblyAISTT.js`.
- **Note:** Root `package.json` keywords still retain `"deepgram"` metadata (non-functional artifact).

## ADR-003: Dual-Layer Clinical Safety Detection (LLM + Deterministic Keyword Safety Net)
- **Status:** Accepted / Implemented (Phase 5)
- **Decision:** Run local zero-latency regex + multi-clause negation analysis (`keywordSafetyNet.js`, `safetyRuleEngine.js`, `contextAnalyzer.js`) independently alongside Gemini tool calling.
- **Consequence:** Acute RED flags are captured even if the external LLM fails, hallucinates, or hits rate limits (429).

## ADR-004: Plain-JavaScript Deterministic Reporting with Template Fail-Safe
- **Status:** Accepted / Implemented (Phase 7)
- **Decision:** Compute all adherence denominators, averages, and missing-data completeness flags strictly in plain JS (`clinicalAnalyticsEngine.js`) before invoking Gemini for constrained 8-section narration (`reportNarrationService.js`), falling back seamlessly to `TEMPLATE_FALLBACK` on validation failure or 429 errors.
- **Consequence:** Zero LLM arithmetic hallucinations and preserved missingness (`DECLINED`/`UNKNOWN` never coerced to `0`).

## ADR-005: Cryptographic SHA-256 Attestation & Non-Destructive Report Versioning
- **Status:** Accepted / Implemented (Phase 7)
- **Decision:** Lock `APPROVED` reports permanently; bind physician approval to a SHA-256 digest (`ReportAttestation.js`); handle revisions exclusively via `amend` spawning `v2+` with `supersedesReportId`.

## ADR-006: Append-Only Consent & Caregiver Audit Ledgers via Mongoose Pre-Hooks
- **Status:** Accepted / Implemented (Phase 3 & Phase 8)
- **Decision:** Block `updateOne`, `updateMany`, `findOneAndUpdate`, and delete operations on `ConsentRecord.js` and `CaregiverAccessEvent.js` inside Mongoose schema hooks.

## ADR-007: Audio Retention Strictly Disabled (`z.literal('disabled')`)
- **Status:** Accepted / Implemented (Phase 3 & Phase 10)
- **Decision:** Lock `AUDIO_RETENTION_MODE` to `'disabled'` in `envValidator.js`. Transient 16kHz PCM audio frames purge on disconnect without disk persistence.

## ADR-008: Durable MongoDB Outbox + BullMQ / InMemoryQueue Adapter
- **Status:** Accepted / Implemented (Phase 9 & 10)
- **Decision:** Stage external alert attempts in `EscalationEvent` before dispatching via BullMQ (`redisConnection.js`), with `outboxReconciler.js` recovering stalled dispatches and `InMemoryQueue` providing local dev compatibility.

## ADR-009: Fail-Closed Zero-PHI Outbound Firewall & Salted Opaque References (Phase 12.2.1)
- **Status:** Accepted / Implemented
- **Decision:** Never transmit patient names, diagnoses, quotes, or raw MongoDB ObjectIds in Twilio SMS or Resend Email alerts. Issue HMAC-SHA256 `ALERT_REF_...` tokens and fail closed inside `auditOutboundPayload()`.
- **Classification:** Heuristic data-minimization and pseudonymization layer (not certified Safe Harbor / Expert Determination).

## ADR-010: Route-Level Code Splitting & Bloom WCAG Token System (`da75a0b`)
- **Status:** Accepted / Implemented
- **Decision:** Use React `lazy()` across all 28 page routes and enforce CSS-variable Bloom semantic tokens verified against 20 Day/Night WCAG contrast pairs (`npm run check:contrast`).

---

## Related Documentation
- [System Architecture](../ARCHITECTURE.md)
- [Known Issues & Open Discrepancies](../../14_DEVELOPMENT_AND_RELEASE/KNOWN_ISSUES.md)
