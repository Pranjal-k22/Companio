# COMPANIO — PHASE 10: OBSERVABILITY, MONITORING & ALERTING

## 1. Observability Overview & Principles
Companio enforces strict enterprise observability standards designed for regulated digital health platforms. The monitoring pipeline provides full visibility across HTTP REST APIs, WebSocket voice interactions, BullMQ background queues, and MongoDB data persistence while strictly upholding HIPAA privacy invariants.

### Core Observability Principles:
1. **Zero Protected Health Information (PHI) in Telemetry**: No metric label, trace span, log line, or alert payload may contain patient names, dates of birth, phone numbers, email addresses, or raw conversational transcripts.
2. **Prometheus / OpenMetrics Standard**: Telemetry is exposed in standard Prometheus text format (`version=0.0.4`) on `/metrics`.
3. **End-to-End Distributed Tracing**: Trace correlation IDs propagate across HTTP requests, MongoDB outbox events, BullMQ background jobs, and clinical reports.
4. **Deterministic Alert Rules**: High and Critical operational thresholds trigger automated alerts with webhook dispatch and automatic recovery detection.

---

## 2. Prometheus OpenMetrics Registry (`metricsRegistry.js`)

Metrics are registered in `server/src/services/telemetry/metricsRegistry.js` and served on `GET /metrics`.

### 2.1 Core Metrics Catalog

| Metric Name | Type | Description | Permitted Labels |
|-------------|------|-------------|------------------|
| `companio_http_requests_total` | Counter | Total HTTP requests handled | `method`, `route`, `status` |
| `companio_http_request_duration_seconds` | Histogram | Request latency distribution (0.01s - 10s buckets) | `method`, `route`, `status` |
| `companio_queue_jobs_total` | Counter | BullMQ background jobs lifecycle count | `queue`, `status` (completed/failed/reconciled) |
| `companio_queue_active_jobs` | Gauge | Currently active background jobs per queue | `queue` |
| `companio_queue_waiting_jobs` | Gauge | Waiting jobs depth per queue | `queue` |
| `companio_voice_sessions_active` | Gauge | Active real-time voice WebSocket sessions | `organization` (hashed/sanitized) |
| `companio_voice_errors_total` | Counter | Real-time audio processing and STT/TTS errors | `provider`, `error_type` |
| `companio_escalations_total` | Counter | Clinical escalation events created | `severity`, `tier`, `channel` |
| `companio_database_connection_status` | Gauge | MongoDB connection state (1=Connected, 0=Degraded) | None |
| `companio_redis_connection_status` | Gauge | Redis connection state (1=Connected, 0=Degraded) | None |
| `companio_outbox_pending_events` | Gauge | Unprocessed or stalled MongoDB outbox events | None |

### 2.2 Scraping Configuration Example (`prometheus.yml`)
```yaml
scrape_configs:
  - job_name: 'companio-backend'
    scrape_interval: 15s
    scrape_timeout: 10s
    metrics_path: '/metrics'
    static_configs:
      - targets: ['companio-server:5000']
```

---

## 3. Operational Alerting Engine (`alertEngine.js`)

The alerting engine monitors operational invariants every 30 seconds (or on-demand) and dispatches alerts when thresholds are breached.

### 3.1 Pre-Configured Operational Alert Rules

| Rule Identifier | Severity | Condition Threshold | Automated Action |
|-----------------|----------|---------------------|------------------|
| `DATABASE_DISCONNECTED` | CRITICAL | MongoDB connection state != 1 | Trigger on-call notification; 503 readiness probe |
| `REDIS_DEGRADED` | HIGH | Redis ping fails or connection lost | Fallback to in-memory buffers; queue pause |
| `OUTBOX_BACKLOG_HIGH` | HIGH | Pending EscalationEvent count > 5 | Initiate immediate outbox reconciler sweep |
| `FAILED_ESCALATION_SPIKE` | CRITICAL | Escalation failure rate > 0 in last 5m | Immediate SMS provider fallback switch |
| `HIGH_HTTP_ERROR_RATE` | HIGH | 5xx status responses > 5% over 1m window | Log alert; trigger traffic reroute |
| `VOICE_GATEWAY_SATURATED` | HIGH | Active voice sessions > 90% org limit | Backpressure throttles new voice attempts |

### 3.2 Alert Lifecycle & Webhook Notification
- **Firing**: Emits `operationalAlert` event, logs structured JSON alert, and dispatches HTTP POST payload to configured `OPS_ALERT_WEBHOOK_URL`.
- **Resolution**: Detects condition recovery automatically, updates state in alert registry, logs resolution, and dispatches clearance payload.

---

## 4. Cross-Tier Distributed Correlation Tracing (`correlationTracker.js`)

To ensure rapid root-cause diagnosis across microservices and background workers, every transaction carries an end-to-end trace context:

```
[Client / Voice Socket / REST Request]
  └─ correlationId: 'req-corr-9281-a7b2'
       │
       ▼
[Clinical Safety Net / Flag Deduplicator]
  └─ Flag._id: 'flg-6a7b...' (records correlationId)
       │
       ▼
[MongoDB Durable Outbox]
  └─ EscalationEvent._id: 'evt-8c9d...' (records correlationId)
       │
       ▼
[Distributed BullMQ Queue]
  └─ Job.data.correlationId: 'req-corr-9281-a7b2'
       │
       ▼
[Report Generation / Attestation]
  └─ Report._id: 'rep-3e4f...' (linked in evidence provenance)
```

### Trace Formatter Utility:
`formatTracePath({ correlationId, flagId, eventId, jobId, reportId })` produces a unified human- and machine-readable correlation breadcrumb:
```
Trace:req-corr-9281-a7b2 ➔ Flag:flg-6a7b ➔ OutboxEvent:evt-8c9d ➔ QueueJob:job-303 ➔ Report:rep-3e4f
```
