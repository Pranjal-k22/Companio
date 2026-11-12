# Companio Monitoring & Prometheus Telemetry Specification

## Document Purpose
Documents Companio's Kubernetes health probes, Prometheus/OpenMetrics `/metrics` exposition endpoint, and all 20 registered zero-PHI telemetry counters, gauges, and histograms.

## Scope
Covers `server/src/routes/health.js`, `server/src/routes/metrics.js`, and `server/src/services/telemetry/metricsRegistry.js`.

## Status
- **Implementation Status:** `IMPLEMENTED` & `TESTED` (`npm run test:operations`)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/routes/health.js](../../server/src/routes/health.js)
- [server/src/routes/metrics.js](../../server/src/routes/metrics.js)
- [server/src/services/telemetry/metricsRegistry.js](../../server/src/services/telemetry/metricsRegistry.js)

---

## 1. Health Probes (`/api/v1/health/*`)

| Probe Endpoint | Intended Use | Readiness Condition |
| :--- | :--- | :--- |
| `GET /api/v1/health` | Full diagnostic health JSON | Reports uptime, heap usage, MongoDB latency, Redis status |
| `GET /api/v1/health/live` | Kubernetes `livenessProbe` | `200 OK` if Node event loop responds |
| `GET /api/v1/health/ready` | Kubernetes `readinessProbe` | `200 OK` only when MongoDB & Redis are healthy; `503` otherwise |
| `GET /api/v1/health/startup` | Kubernetes `startupProbe` | Confirms worker bootstrap & listeners initialized |

---

## 2. Prometheus Metrics Catalog (`GET /metrics`, 20 Registered Metrics)

- **HTTP & Auth:** `companio_http_requests_total`, `companio_http_request_duration_ms`, `companio_http_errors_total`, `companio_auth_failures_total`
- **Datastores:** `companio_database_status`, `companio_database_latency_ms`, `companio_redis_status`, `companio_redis_latency_ms`
- **Voice & Providers:** `companio_voice_sessions_active`, `companio_voice_session_failures_total`, `companio_voice_barge_in_interruptions_total`, `companio_provider_errors_total`
- **Queues & Workers:** `companio_queue_jobs_waiting`, `companio_queue_jobs_active`, `companio_queue_jobs_failed`, `companio_queue_workers_active`
- **Clinical Outbox & Alerts:** `companio_outbox_backlog_total`, `companio_clinical_escalations_total`, `companio_clinical_escalation_failures_total`, `companio_alerts_fired_total`

**Zero-PHI Label Guarantee:** Metric label arrays permit only non-identifying operational keys (`queue`, `tier`, `channel`, `rule`, `severity`, `provider`, `type`, `status`).

---

## 3. Related Documentation
- [ALERTING.md](./ALERTING.md)
- [LOGGING.md](./LOGGING.md)
- [PHI_HANDLING.md](../09_SECURITY_AND_PRIVACY/PHI_HANDLING.md)
