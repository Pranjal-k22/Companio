# Companio Security & Privacy Incident Response Runbook

## Document Purpose
Defines operational containment, investigation, communication, and post-mortem procedures for security or suspected privacy incidents in Companio, without fabricating unverified external contact addresses or compliance claims.

## Scope
Covers suspected credential leaks, cross-tenant leakage, outbound PHI egress anomalies, third-party vendor breaches, and service availability incidents.

## Status
- **Technical Containment & Log Correlation Controls:** `IMPLEMENTED` (`X-Request-Id`, `passwordChangedAt`, `Membership` suspension, caregiver grant revocation, fail-closed `deidentificationService` audit)
- **Live Legal Breach Notification Counsel / Officer Roster:** `BLOCKED` / `PENDING` (no organizational Privacy Officer contact exists in repo)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/middleware/auth.js](../../server/src/middleware/auth.js)
- [server/src/middleware/requestContext.js](../../server/src/middleware/requestContext.js)
- [server/src/services/privacy/deidentificationService.js](../../server/src/services/privacy/deidentificationService.js)

---

## 1. Incident Triage & Containment Playbook

| Incident Type | Immediate Technical Containment (Implemented Mechanisms) | Verification / Evidence Source |
| :--- | :--- | :--- |
| **Compromised User Credentials** | Force password reset (`passwordChangedAt` invalidates existing JWTs) and/or set `Membership.status = 'suspended'` via `/api/v1/organizations/:id/members/:memberId` | Correlated `X-Request-Id` application logs |
| **Suspected Caregiver Misuse** | Revoke relationship/grant immediately via `POST /api/v1/caregivers/invitations/:id/revoke` or `POST /api/v1/caregiver-access/:grantId/revoke` | Immutable `CaregiverAccessEvent` audit trail |
| **Outbound Notification PHI Leak** | Disable SMS/Email escalation env flags (`ENABLE_EMAIL_ESCALATION=false`, `ENABLE_SMS_ESCALATION=false`) immediately and inspect Redis dead-letter / failed queues via `/api/v1/admin/queues/:name/failed` | Run `npm run test:deid:audit` + inspect `EscalationEvent` |
| **Leaked API Keys / Secrets** | Rotate `JWT_SECRET`, `REID_SECRET_PEPPER`, `ASSEMBLYAI_API_KEY`, `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `TWILIO_AUTH_TOKEN`, or `RESEND_API_KEY` at secret store and redeploy | Inspect provider billing/access logs |

---

## 2. Severity & Regulatory Escalation Note

- Because Companio currently operates under a **Synthetic-Data Only Stop Gate**, any real-patient data detected in a test or staging environment is a **Severity 1 (Critical)** containment incident requiring immediate DB purge and leadership escalation through the project owners.

---

## 3. Related Documentation
- [../../SECURITY.md](../../SECURITY.md)
- [AUDIT_LOGGING.md](./AUDIT_LOGGING.md)
- [OPERATIONAL_RUNBOOKS.md](../11_INFRASTRUCTURE_AND_OPERATIONS/OPERATIONAL_RUNBOOKS.md)
