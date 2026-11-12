# Companio Debugging Guide

**Owner category:** Engineering  
**Status:** Working diagnostic protocol  
**Last verified:** 2026-11-12

## Debugging loop

1. Reproduce the issue using synthetic data.
2. Capture error, request ID, route, environment and timestamps; remove secrets and PHI.
3. Identify the failing boundary: browser, REST API, Socket.IO, provider, database, Redis, worker or report pipeline.
4. Read relevant implementation and authoritative documentation.
5. Form a root-cause hypothesis before patching.
6. Apply the smallest change addressing the cause.
7. Run the narrow test and affected regression suites.
8. Inspect the diff and verify unrelated files or safety rules did not change.
9. Update documentation when behavior or configuration changes.

## First places to inspect

| Symptom | First places to inspect |
|---|---|
| Authentication failure | `server/src/middleware/auth.js`, auth routes and schemas |
| Cross-tenant mismatch | tenant context, tenant authorization and organization-scoped queries |
| Voice session failure | `server/src/sockets/`, voice state machine and provider adapters |
| Consent blocks voice | consent service, consent records and voice initialization |
| Clinical flag missing | context analyzer, keyword safety net, rule engine and flag deduplication |
| Notification not sent | EscalationEvent state, dispatcher, provider config and queue worker |
| Queue degraded | Redis connection, queue manager, Redis health and outbox reconciliation |
| Report invalid/stale | report generator, metric calculators, provenance validator and attestation |
| Caregiver access denied | relationship state, grants, authorization middleware and audit event |

## Safe diagnostics

- Never paste patient transcripts, audio, JWTs, API keys or production exports into issue trackers or AI prompts.
- Do not disable consent, tenant isolation or clinical safety checks to reproduce an issue.
- Use synthetic fixtures and test providers where possible.