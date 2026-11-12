# Companio Load, Concurrency & Performance Verification

## Document Purpose
Documents implemented concurrency controls, multi-worker queue stress tests, voice pipeline latency collectors, and explicit boundaries regarding cloud-scale load testing.

## Scope
Covers BullMQ worker scaling (`testRealRedisMultiWorker.js`), voice telemetry bounds (`voiceMetricsCollector.js`, `voiceResourceLimiter.js`), report concurrency limits, and unverified cloud soak testing.

## Status
- **Queue Concurrency & Redis Multi-Worker Tests:** `IMPLEMENTED` (`npm run test:redis`)
- **Production-Scale Distributed Load Test (k6 / Locust / Production Cluster):** `NOT VERIFIED`

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/tests/jobs/testRealRedisMultiWorker.js](../../server/src/tests/jobs/testRealRedisMultiWorker.js)
- [server/src/tests/voice/testVoiceResourceLimits.js](../../server/src/tests/voice/testVoiceResourceLimits.js)
- [server/src/jobs/queueConfig.js](../../server/src/jobs/queueConfig.js)
- [VOICE_PERFORMANCE_BENCHMARKS.md](../06_AI_AND_VOICE/VOICE_PERFORMANCE_BENCHMARKS.md)

---

## 1. Concurrency Guardrails Implemented in Code

- **Bounded Report Synthesis:** `report-generation` queue limits concurrency to `2` (`MAX_REPORT_CONCURRENCY=2`) to avoid LLM quota spikes and heap exhaustion.
- **Voice Buffer Bounds:** `assemblyAISTT.js` caps un-flushed audio ring buffer at `MAX_QUEUE_SIZE = 20` chunks and tears down streams after `60s` idle timeout.
- **Multi-Worker Queue Locking:** `testRealRedisMultiWorker.js` verifies BullMQ distributed job locks prevent duplicate processing when running multiple worker processes against live Redis.

---

## 2. Unverified Scale Scope

Companio has **not** been subjected to sustained multi-hundred-concurrent-WebSocket cloud load testing (e.g., k6/Artillery against live AssemblyAI + ElevenLabs + Gemini accounts). Pilot onboarding must enforce strict cohort concurrency caps matching contracted vendor rate limits.

---

## 3. Related Documentation
- [VOICE_PERFORMANCE_BENCHMARKS.md](../06_AI_AND_VOICE/VOICE_PERFORMANCE_BENCHMARKS.md)
- [QUEUE_OPERATIONS.md](../11_INFRASTRUCTURE_AND_OPERATIONS/QUEUE_OPERATIONS.md)
