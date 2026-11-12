# Twilio SMS Notification & Escalation Integration

## Document Purpose
Documents Twilio SDK configuration, queue worker execution, fail-closed zero-PHI template guarantees, and sandbox behavior for SMS notifications and clinical escalations.

## Scope
Covers `server/src/jobs/workers/smsNotificationWorker.js` (`twilio` `6.1.1`) and SMS escalation dispatchers.

## Status
- **Implementation Status:** `IMPLEMENTED`
- **Production BAA:** `BLOCKED` / `PENDING`

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/jobs/workers/smsNotificationWorker.js](../../server/src/jobs/workers/smsNotificationWorker.js)
- [server/src/services/escalation/escalationDispatcher.js](../../server/src/services/escalation/escalationDispatcher.js)
- [server/src/services/privacy/deidentificationService.js](../../server/src/services/privacy/deidentificationService.js)

---

## 1. Configuration & Runtime Controls

- **Environment Variables:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` (or `TWILIO_PHONE_NUMBER`), `ENABLE_SMS_NOTIFICATIONS`, `ENABLE_SMS_ESCALATION`.
- **Sandbox Mode:** When disabled or credentials are missing, `smsNotificationWorker.js` returns a deterministic mock receipt (`MOCK_SMS_<timestamp>`) without throwing errors.
- **Privacy Constraint:** Clinical escalation SMS bodies use tokenized zero-PHI templates (`createZeroPhiNotificationPayload` + `auditOutboundPayload`)—containing urgency and review instructions without patient names, symptoms, or transcripts. Notice that logger output masks the recipient (`[REDACTED_PHONE]`).

---

## 2. Related Documentation
- [DEIDENTIFICATION.md](../09_SECURITY_AND_PRIVACY/DEIDENTIFICATION.md)
- [NOTIFICATION_DELIVERY.md](../07_CLINICAL_SAFETY/NOTIFICATION_DELIVERY.md)
- [INTEGRATIONS.md](./INTEGRATIONS.md)
