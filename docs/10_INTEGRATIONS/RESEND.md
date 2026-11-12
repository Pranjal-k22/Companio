# Resend Email Notification & Escalation Integration

## Document Purpose
Documents Resend SDK configuration, transactional and clinical escalation email dispatch, fail-closed zero-PHI checks, and BullMQ retry behavior.

## Scope
Covers `server/src/jobs/workers/emailNotificationWorker.js` (`resend` `6.28.1`) and email escalation paths.

## Status
- **Implementation Status:** `IMPLEMENTED`
- **Production BAA:** `BLOCKED` / `PENDING`

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/jobs/workers/emailNotificationWorker.js](../../server/src/jobs/workers/emailNotificationWorker.js)
- [server/src/services/escalation/escalationDispatcher.js](../../server/src/services/escalation/escalationDispatcher.js)
- [server/src/services/privacy/deidentificationService.js](../../server/src/services/privacy/deidentificationService.js)

---

## 1. Configuration & Retry Behavior

- **Environment Variables:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (defaults to `notifications@companio.app`), `ENABLE_EMAIL_NOTIFICATIONS`, `ENABLE_EMAIL_ESCALATION`.
- **BullMQ Retry Integration:** API exceptions from `resend.emails.send(...)` rethrow so BullMQ executes exponential backoff retries and updates `EscalationEvent` status.
- **Sandbox Mode:** When disabled or `RESEND_API_KEY` matches template placeholder values, returns `{ mock: true, providerMessageId: 'MOCK_EMAIL_<ts>' }`.
- **Privacy Constraint:** Logs mask destination email (`[REDACTED_EMAIL]`), and clinical escalation emails contain tokenized opaque references rather than patient PII.

---

## 2. Related Documentation
- [DEIDENTIFICATION.md](../09_SECURITY_AND_PRIVACY/DEIDENTIFICATION.md)
- [NOTIFICATION_DELIVERY.md](../07_CLINICAL_SAFETY/NOTIFICATION_DELIVERY.md)
- [WEBHOOKS.md](../05_API/WEBHOOKS.md)
