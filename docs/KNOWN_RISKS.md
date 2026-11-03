# ⚠️ Companio — Known Risks & Mitigation Log

**Document Reference**: `docs/KNOWN_RISKS.md`  
**Product**: AI Voice-First Health & Wellness Platform for Adults 55+  
**Evaluation Date**: November 3, 2026  
**Status**: Active Risk Register (Pre-Production / Phase 0 Baseline)  

---

## 1. Clinical Safety Risks

### 1.1 Unintended Emergency Reliance (High Severity)
* **Risk**: A patient or family member may believe that speaking to Companio during an acute event (e.g. cardiac arrest, active stroke, severe trauma) acts as an automated emergency dispatch service (911 / 112).
* **Current Safeguards**:
  - The deterministic safety net recognizes acute phrases and immediately advises calling 911/emergency services.
  - UI displays an emergency disclaimer on patient dashboards and error boundaries.
* **Target Mitigation (Phase 3 & 6)**:
  - Add unambiguous spoken agent disclaimer during onboarding and red flag encounters: *"I am an automated assistant, not an emergency dispatcher. If you are in immediate danger, please hang up and call 911."*
  - Clinician portal must clearly display notification dispatch timestamps and avoid implying active vital monitoring.

### 1.2 STT Transcription Errors on Older Adult Speech (Medium Severity)
* **Risk**: Older adults may speak with tremors, soft volume, regional accents, dentures, or background television noise, causing AssemblyAI to mishear medication names or symptoms (e.g., "Metoprolol" transcribed as "Metformin").
* **Current Safeguards**:
  - AssemblyAI confidence scoring (`confidence < 0.65` flagged as uncertain).
  - Older adult silence threshold set to 900ms to avoid cutting off hesitant speech.
* **Target Mitigation (Phase 5)**:
  - Implement a mandatory verbal read-back confirmation step before finalizing medication logs: *"I heard that you took your morning Lisinopril. Is that correct?"*
  - Retain raw user turn text alongside normalized observation records for clinician auditability.

### 1.3 LLM Hallucination & Diagnostic Creep (High Severity)
* **Risk**: A large language model may attempt to diagnose a condition, suggest medication dose adjustments, or invent physiological facts.
* **Current Safeguards**:
  - Gemini prompt explicitly forbids diagnosis and medication recommendations.
  - All numerical trend calculations are computed using deterministic JavaScript math in `reportGenerator.js`.
* **Target Mitigation (Phase 7)**:
  - Strict JSON schema validation that rejects responses containing diagnostic keywords or ungrounded statistics.
  - Enforce that all AI-generated clinician reports remain in `draft` status until explicitly reviewed, amended, and attested by an authenticated human clinician.

---

## 2. Technical & Architecture Risks

### 2.1 External LLM Quota Exhaustion & High-Demand Spikes (High Severity)
* **Risk**: External AI APIs (Google Gemini, AssemblyAI, ElevenLabs) may return HTTP 429 (Rate Limit / Quota Exceeded), HTTP 503 (High Demand), or experience network outages mid-session.
* **Demonstrated Impact**:
  - During baseline verification on November 3, 2026, `gemini-3.8-flash` reached its Google Free Tier quota limit (20 requests/day).
* **Current Safeguards**:
  - Automated candidate failover to `gemini-2.5-flash` with a 12s timeout.
  - Fail-safe deterministic template generator (`generateFallbackTemplateReport`) and deterministic NLP fallback in `healthConversationAgent.js`.
* **Target Mitigation (Phase 9 & 10)**:
  - Upgrade to dedicated Google Cloud Gemini enterprise quota tier.
  - Circuit breakers with exponential backoff and localized queueing.

### 2.2 In-Memory Cron Job Duplication in Scaled Deployments (Medium Severity)
* **Risk**: `server/src/jobs/weeklyReportWorker.js` currently uses `node-cron` running in the Node.js process memory. In a multi-container Docker or Kubernetes deployment, every container instance would execute the batch cron job simultaneously, leading to race conditions and duplicate report generation.
* **Current Safeguards**:
  - 50-patient batch chunking with per-patient error isolation.
* **Target Mitigation (Phase 9)**:
  - Introduce Redis and BullMQ distributed job scheduling with unique idempotency keys (`weekly-report:{patientId}:{periodStart}:{periodEnd}`).

### 2.3 Network Drops During Real-Time Voice Sessions (Medium Severity)
* **Risk**: An older adult on home Wi-Fi or mobile data may experience packet loss or temporary disconnection while speaking.
* **Current Safeguards**:
  - `useNetworkStatus` hook detects offline state and displays a non-intrusive floating toast.
  - Socket disconnect handler updates `Conversation` status to `interrupted`.
* **Target Mitigation (Phase 4)**:
  - Add monotonic sequence numbers to incoming audio chunks to detect frame loss.
  - Implement seamless session reconnect within a 30-second window to resume check-in without losing prior dialogue turns.

---

## 3. Security, Privacy & Regulatory Compliance Risks

### 3.1 Single-Tenant Data Leakage Risk (High Severity)
* **Risk**: Currently, models (`Patient`, `Checkin`, `Flag`, `Report`) do not store an `organizationId`. A clinician authenticated in the system could theoretically view patients from another facility if multi-facility data is loaded.
* **Current Safeguards**:
  - JWT RBAC middleware restricts patient endpoints to `CLINICIAN` and `ADMIN` roles.
* **Target Mitigation (Phase 2)**:
  - Introduce `Organization` and `Membership` schemas.
  - Mandate `organizationId` compound indexes and query filters on every database query.
  - Enforce patient-care-team assignment checks on every read and write.

### 3.2 Lack of Granular, Versioned Consent Records (High Severity)
* **Risk**: No granular record exists proving that a patient consented specifically to live speech transcription vs. long-term audio storage, which is required under data privacy standards.
* **Target Mitigation (Phase 3)**:
  - Create `ConsentRecord` collection capturing purpose, notice version, timestamp, actor, and decision.
  - Enforce `AUDIO_RETENTION_MODE=disabled` by default across all environments.

### 3.3 Regulatory & Compliance Misrepresentation (Critical Severity)
* **Risk**: Marketing or labelling Companio as "HIPAA Compliant", "DPDP Compliant", or a "Clinically Validated Medical Device" solely because technical code controls exist.
* **Policy Rule**:
  - Companio is a clinical support communication platform, NOT a medical device.
  - Formal organizational policies, Business Associate Agreements (BAAs), security penetration tests, and legal counsel reviews are required before making compliance claims.

---

## 4. Operational & Clinician Workflow Risks

### 4.1 "Alert Fatigue" and Unacknowledged Escalations (High Severity)
* **Risk**: High volumes of yellow flags may desensitize clinicians, or a critical red flag SMS sent at 3:00 AM may go unread if the on-call clinician is unavailable.
* **Current Safeguards**:
  - Urgent Red flags trigger both immediate email and SMS alerts.
  - Clinician dashboard sorts patients with open Red flags to the top of the queue.
* **Target Mitigation (Phase 6)**:
  - Organization-defined Acknowledgement SLAs (e.g., 15-minute response window).
  - Automated secondary escalation: if the assigned clinician does not acknowledge within the SLA window, route alert to the backup hospital cardiology triage desk.

---

## 5. Risk Assessment Summary Table

| Risk Category | Inherent Risk | Residual Risk (Post-Phase 0) | Target Risk (Post-Phase 10) | Primary Mitigation Milestone |
|---|:---:|:---:|:---:|---|
| **Emergency 911 Confusion** | Critical | Medium | Low | Phase 3 & 6 (Disclaimers & SLAs) |
| **LLM Diagnostic Creep** | High | Low | Very Low | Phase 7 (Strict JSON Schemas + Draft State) |
| **Quota & Demand Spikes** | High | Medium | Low | Phase 9 (Redis Queues & Enterprise Tier) |
| **STT Older Adult Accents** | Medium | Medium | Low | Phase 5 (Read-back Confirmation Loop) |
| **Cross-Tenant IDOR** | High | Medium | Very Low | Phase 2 (Organization & Care-Team Scoping) |
| **Unacknowledged Red Flags** | High | Medium | Low | Phase 6 (SLA Timers & Secondary Routing) |
