# Companio Webhooks & Event Callbacks Specification

## Document Purpose
Documents Companio's implemented outbound operational alert webhook capability, schema readiness for clinical escalation webhooks, and the explicit absence of inbound third-party webhook receivers.

## Scope
Covers `server/src/services/telemetry/alertEngine.js`, `EscalationEvent.channel`, and vendor callback boundaries (Twilio, Resend, AssemblyAI).

## Status
- **Operational Alert Outbound Webhook:** `IMPLEMENTED` (`ALERT_WEBHOOK_URL`)
- **Clinical Flag Escalation Webhook Channel:** `PARTIALLY IMPLEMENTED` (supported as `'WEBHOOK'` enum on `EscalationEvent`; email/SMS delivery workers are primary)
- **Inbound Provider Delivery Webhooks (Twilio/Resend status callbacks):** `PLANNED` / `NOT IMPLEMENTED`

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/services/telemetry/alertEngine.js](../../server/src/services/telemetry/alertEngine.js)
- [server/src/models/EscalationEvent.js](../../server/src/models/EscalationEvent.js)
- [server/src/services/escalation/escalationDispatcher.js](../../server/src/services/escalation/escalationDispatcher.js)

---

## 1. Outbound Operational Alert Webhook (`alertEngine.js`)

When `process.env.ALERT_WEBHOOK_URL` is configured, `alertEngine._dispatchWebhook(alertRecord)` performs an outbound HTTP `POST` with `Content-Type: application/json` containing system telemetry alert records (database disconnect, elevated 5xx error rates, queue backlogs, escalation SLA misses).

- **Zero-PHI Guarantee:** Telemetry alerts evaluate counter/gauge thresholds from `metricsRegistry.js`, containing **zero patient names, transcripts, or phone numbers**.
- **Failure Handling:** Non-blocking fire-and-forget `fetch(...)`; delivery errors log a warning (`[AlertEngine] Webhook delivery failed`) without crashing API request handling.

---

## 2. Inbound Provider Callback Gap

Currently, `server/src/routes/` defines **zero** unauthenticated webhook receiver routes (e.g., for Twilio delivery-status receipts or Resend bounce callbacks). `EscalationEvent.deliveredAt` reflects API acceptance from outbound workers rather than asynchronous carrier receipt callbacks.

Any future inbound webhook endpoint MUST verify provider HMAC signatures before parsing payloads and enforce zero-PHI payload logging.

---

## 3. Related Documentation
- [ALERTING.md](../11_INFRASTRUCTURE_AND_OPERATIONS/ALERTING.md)
- [NOTIFICATION_DELIVERY.md](../07_CLINICAL_SAFETY/NOTIFICATION_DELIVERY.md)
- [API_CONTRACT.md](./API_CONTRACT.md)
