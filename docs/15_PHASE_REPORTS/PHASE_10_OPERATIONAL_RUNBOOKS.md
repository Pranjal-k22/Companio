# COMPANIO — PHASE 10: OPERATIONAL DISASTER RECOVERY RUNBOOKS

This document contains 9 step-by-step production disaster recovery runbooks for platform engineers, DevOps staff, and on-call site reliability engineers managing Companio.

---

## RUNBOOK 1: Redis Primary Outage & Degraded Mode Mitigation

### 1.1 Symptoms
- Alert `REDIS_DEGRADED` fires in Ops channel.
- `/api/v1/health` reports `"dependencies": { "redis": { "status": "DEGRADED" } }`.
- Background job processing halts or BullMQ connection errors logged (`ECONNREFUSED`).

### 1.2 Impact
- Real-time voice sessions and REST APIs remain functional.
- Immediate background jobs failover to the MongoDB durable outbox or in-memory fallback.
- No clinical flags are lost.

### 1.3 Step-by-Step Remediation
1. **Verify Redis Container/Service Health**:
   ```bash
   docker ps | grep redis
   docker logs --tail 100 companio-redis
   ```
2. **If Sentinel Failover Did Not Complete**:
   - Check Sentinel logs: `docker logs --tail 50 companio-sentinel`.
   - Manually verify replica promotion: `redis-cli -p 26379 sentinel get-master-addr-by-name mymaster`.
3. **Restart Service**:
   ```bash
   docker compose restart redis
   ```
4. **Trigger Queue Manager Reconnect**:
   - The backend `redisConnection.js` auto-reconnects with exponential backoff (up to 30s).
   - Verify health: `curl -s http://localhost:5000/api/v1/health | grep redis`.
5. **Reconcile Stalled Outbox Events**:
   - The Outbox Reconciler will automatically re-dispatch pending MongoDB events once Redis status recovers to `HEALTHY`.
   - Trigger immediate sweep:
     ```bash
     curl -X POST -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost:5000/api/v1/admin/queues/maintenance/trigger -d '{"task":"RECONCILE_OUTBOX"}'
     ```

---

## RUNBOOK 2: MongoDB Replica Set Disconnect & Degradation

### 2.1 Symptoms
- Alert `DATABASE_DISCONNECTED` fires.
- `/api/v1/health/ready` returns `HTTP 503 Service Unavailable`.
- Kubernetes readiness probes fail, preventing new traffic routing to impacted pods.

### 2.2 Impact
- Read/write operations fail. High severity operational emergency.

### 2.3 Step-by-Step Remediation
1. **Inspect Mongo Pod/Container Status**:
   ```bash
   docker compose ps mongo
   docker logs --tail 100 companio-mongo
   ```
2. **Check Replica Set Quorum & Primary Election**:
   ```bash
   mongosh --eval "rs.status()"
   ```
3. **If Disk Volume Full**:
   - Free ephemeral logs: `truncate -s 0 /var/log/mongodb/*.log`.
   - Expand EBS/Persistent Volume and restart MongoDB.
4. **Verify Application Reconnection**:
   - Node Mongoose driver re-establishes pool connections automatically.
   - Run health probe: `curl -i http://localhost:5000/api/v1/health/ready` (Expect `200 OK`).

---

## RUNBOOK 3: Worker Node Process Crash & Lock Recovery

### 3.1 Symptoms
- Worker pod terminates unexpectedly (OOMKilled, node restart).
- Jobs in BullMQ remain in `active` state with locks held.

### 3.2 Impact
- Active jobs pause temporarily until lock timeout expires (default: 30,000ms).

### 3.3 Step-by-Step Remediation
1. **Verify BullMQ Automated Stalled Job Reclamation**:
   - BullMQ worker instances run automatic stalled checks every 30 seconds (`stalledInterval: 30000`).
   - The remaining active worker instances reclaim stalled jobs and re-attempt execution.
2. **Inspect Dead-Letter Queue**:
   ```bash
   curl -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost:5000/api/v1/admin/queues/clinical-escalation/failed
   ```
3. **Revive Legitimate Jobs**:
   ```bash
   curl -X POST -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost:5000/api/v1/admin/queues/clinical-escalation/retry
   ```

---

## RUNBOOK 4: Third-Party Provider Outage (Twilio / Resend 429/500)

### 4.1 Symptoms
- Alert `FAILED_ESCALATION_SPIKE` fires.
- Logs show Twilio rate limit (`429 Too Many Requests`) or Resend upstream error (`500`).

### 4.2 Impact
- Outbound SMS/Email notifications fail temporary dispatch.
- Clinical Safety Net Invariant: MongoDB `Flag` remains strictly `escalated`.

### 4.3 Step-by-Step Remediation
1. **Verify Exponential Backoff Scheduling**:
   - The `clinicalEscalationWorker` automatically schedules retry attempts at exponential delays (5s, 15s, 45s).
   - Status transitions to `RETRY_PENDING` in MongoDB `EscalationEvent`.
2. **Switch Delivery Channels if Provider Degraded**:
   - For RED severity flags where SMS fails, the dispatcher auto-promotes to secondary on-call email notification.
3. **Verify Provider Status**:
   - Twilio Status: `https://status.twilio.com`
   - Resend Status: `https://status.resend.com`

---

## RUNBOOK 5: Failed Clinical Escalation & Safety Net Containment

### 5.1 Symptoms
- `EscalationEvent` reaches `maxAttempts` (3/3) and transitions to `FAILED`.
- Tier-1 notification delivery could not be confirmed.

### 5.2 Critical Safety Invariant
- **UNDER NO CIRCUMSTANCES DOES A FAILED NOTIFICATION DOWNGRADE OR RESOLVE A CLINICAL FLAG.**
- The `Flag` document remains permanently in `status: "escalated"` until an authorized clinician signs off.

### 5.3 Step-by-Step Remediation
1. **Identify Unresolved High-Acuity Flags**:
   ```bash
   mongosh companio --eval 'db.flags.find({ status: "escalated", severity: "RED" })'
   ```
2. **Trigger Tier-2 Supervisor Escalation**:
   - The SLA Monitor worker detects unacknowledged RED flags exceeding 15 minutes and automatically generates Tier-2 supervisor alerts.
3. **Manual Clinician Telephone Escalation**:
   - Clinical on-call supervisor contacts patient via primary telephone number immediately.
4. **Record Resolution Post-Intervention**:
   - Clinician resolves flag via Clinician Portal with mandatory clinical rationale notes.

---

## RUNBOOK 6: Queue Backlog Accumulation & Worker Scaling

### 6.1 Symptoms
- Alert `OUTBOX_BACKLOG_HIGH` fires.
- Metric `companio_queue_waiting_jobs{queue="report-generation"}` > 100.

### 6.2 Remediation
1. **Check Worker Pod Scalability**:
   ```bash
   kubectl get hpa companio-worker
   kubectl scale deployment companio-worker --replicas=5
   ```
2. **Check Redis Memory Ceiling**:
   - Run `redis-cli INFO memory`. If `used_memory` approaches `maxmemory`, expand Redis instance memory or verify key TTL policies.
3. **Inspect Problematic Heavy Payloads**:
   - Inspect waiting jobs to verify no circular dependency or payload explosion.

---

## RUNBOOK 7: Stuck Job Investigation & Purge Protection

### 7.1 Safeguard Constraint
- Queue cleanup API endpoints (`POST /api/v1/admin/queues/:name/clean`) **MUST NEVER PURGE CLINICAL DATA IN MONGODB**.
- They only clear BullMQ Redis key artifacts. MongoDB `EscalationEvent` and `Flag` audit documents are immutable.

### 7.2 Remediation
1. **Inspect Stalled Job ID in Redis**:
   ```bash
   redis-cli HGETALL bull:clinical-escalation:<jobId>
   ```
2. **Inspect Corresponding MongoDB Audit Event**:
   ```bash
   mongosh companio --eval 'db.escalationevents.findOne({ "metadata.reconciledJobId": "<jobId>" })'
   ```
3. **Clear Stalled Redis Job Safely**:
   ```bash
   curl -X POST -H "Authorization: Bearer <CLINICIAN_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"type":"failed"}' \
     http://localhost:5000/api/v1/admin/queues/clinical-escalation/clean
   ```

---

## RUNBOOK 8: Database Backup, Snapshot & Recovery Drill

### 8.1 Automated Backup Policy
- Nightly automated `mongodump` archive with AES-256 GCM encryption.
- Point-in-time recovery enabled via MongoDB oplog replication.

### 8.2 Recovery Drill Procedure
1. **Create Point-in-Time Snapshot**:
   ```bash
   mongodump --uri="mongodb://localhost:27017/companio" --gzip --archive=/backups/companio-$(date +%F-%H%M).gz
   ```
2. **Verify Archive Cryptographic Integrity**:
   ```bash
   sha256sum /backups/companio-*.gz
   ```
3. **Simulate Staging Restore**:
   ```bash
   mongorestore --uri="mongodb://localhost:27017/companio_staging" --gzip --archive=/backups/companio-*.gz --nsFrom="companio.*" --nsTo="companio_staging.*"
   ```
4. **Verify Document Counts Match Baseline**:
   - Patients, Flags, Observations, Reports, EscalationEvents must reconcile 100%.

---

## RUNBOOK 9: Deployment Rollback & Zero-Downtime Reversion

### 9.1 Rollback Criteria
- Elevated 5xx error rate (>1%) following new container deployment.
- High crash restart count on server pods.
- Release Gate regression detected in production probes.

### 9.2 Step-by-Step Rollback Execution
1. **Rollback Container Image via Orchestrator**:
   ```bash
   # Kubernetes
   kubectl rollout undo deployment/companio-backend
   kubectl rollout status deployment/companio-backend
   ```
   ```bash
   # Docker Compose
   docker compose pull companio-server:<PREVIOUS_GIT_SHA>
   docker compose up -d --no-deps companio-server
   ```
2. **Verify Schema Backward Compatibility**:
   - Database migrations in Companio are strictly backward-compatible. Older backend versions operate transparently on new schema versions.
3. **Confirm Health and Readiness Probes**:
   ```bash
   curl -s http://localhost:5000/api/v1/health/ready
   ```
4. **Post-Mortem & Incident Logging**:
   - File post-mortem report within 24 hours citing root cause, metric anomaly, and preventative guardrails.
