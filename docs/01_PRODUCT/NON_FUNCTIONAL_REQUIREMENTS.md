# Companio — Non-Functional Requirements (NFR)

**Document Purpose:** Define measured and required non-functional attributes across Accessibility, Reliability, Security, Privacy, Performance, and Maintainability.  
**Scope:** Companio client, server, worker, and infrastructure tiers.  
**Status:** `PARTIALLY VERIFIED (SYNTHETIC ENVIRONMENT)`  
**Owner Category:** Engineering & Infrastructure  
**Last Verified Date:** 2026-11-12  
**Relevant Source Files:** [`client/src/tests/testColorContrast.js`](../../client/src/tests/testColorContrast.js), [`server/src/middleware/rateLimiter.js`](../../server/src/middleware/rateLimiter.js), [`server/src/config/envValidator.js`](../../server/src/config/envValidator.js)

---

## 1. Accessibility & Senior Ergonomics (WCAG 2.1 AA/AAA)
- **Color Contrast:** Verified via `npm run check:contrast` across **20/20** Bloom Day/Night token pairs; patient body/strong text exceeds `7.0:1` (WCAG AAA); Coral (`#EF8557`) text prohibited in Day mode (`2.32:1` fail check enforced). *(VERIFIED)*
- **Typography & Scaling:** Continuous root `html` scaling (`100%`, `125%`, `150%`) persisted via `ThemeContext`; `prefers-reduced-motion` disables CSS/framer motion transitions. *(IMPLEMENTED)*
- **Touch Targets:** Minimum `48px` interactive targets and `64px+` primary voice CTA controls. *(IMPLEMENTED / real elderly device usability testing `PENDING IRB`)*

## 2. Reliability & Resilience
- **Voice Session Continuity:** 13-state FSM (`voiceSessionStateMachine.js`), bounded frame buffers (`MAX_QUEUE_SIZE`), 32-byte single-use resume tokens, and network-loss toast recovery (`useNetworkStatus.js`). *(TESTED)*
- **Notification Durability:** Transactional MongoDB outbox (`EscalationEvent`) + BullMQ exponential retry + 60s `outboxReconciler.js` sweep guaranteeing flags never silently drop or downgrade. *(TESTED)*
- **Offline Redis Resilience:** Development/test fallback via `InMemoryQueue`, strictly configurable with `ALLOW_IN_MEMORY_FALLBACK=false` in production. *(TESTED)*

## 3. Security, Privacy & Isolation
- **Strict Tenant Isolation:** Middleware `tenantContext` rejects cross-organization record access across all 22 models. *(TESTED)*
- **Audio Retention Invariant:** Zod startup validator (`envValidator.js`) enforces `AUDIO_RETENTION_MODE=disabled`. *(VERIFIED)*
- **Fail-Closed Outbound Firewall:** `auditOutboundPayload` blocks Twilio/Resend dispatch if residual PHI or raw ObjectIds appear (`npm run test:deid:audit`, 30/30 passed). *(TESTED)*
- **Rate Limiting:** Auth endpoints limited to `20 req / 15 min`; standard REST endpoints limited via `rateLimiter.js` (`env: RATE_LIMIT_MAX_REQUESTS=100` in `.env.production.example`; `300 req / 1 min` in `apiLimiter`). *(IMPLEMENTED — exact limits should be verified directly in `rateLimiter.js` during audit)*

## 4. Performance & Resource Limits
- **Code Splitting:** Vite `React.lazy` splits main client entry to `324.06 kB` (`98.98 kB` gzip) and Recharts chunk to `365.97 kB` (`107.29 kB` gzip). *(VERIFIED `npm run build:client`)*
- **Concurrency Limits:** Voice gateway caps concurrent sessions at 1 per user and 25 per organization (`voiceResourceLimiter.js`), rejects audio frames > 8KB (`MAX_AUDIO_FRAME_BYTES`). Report generation worker concurrency throttled to `2` (`MAX_REPORT_CONCURRENCY`). *(TESTED)*
- **Local Throughput Benchmarks:** Earlier historical tests noted ~775ms mock/streamed turn latency and ~1ms avg under 50 local concurrent requests (`testPhase10Operations.js`); **production load testing under realistic external API latency is NOT VERIFIED**.

## 5. Limitations & Unresolved Questions
- Live production SLA uptime (99.9%), horizontal sticky-session Socket.IO Redis adapter scaling, and Playwright runtime axe-core automated browser checks are **NOT VERIFIED / NOT IMPLEMENTED**.

## 6. Related Documentation
- [Accessibility Guidelines](../02_DESIGN/ACCESSIBILITY.md)
- [Load & Performance Testing](../12_TESTING_AND_QUALITY/LOAD_AND_PERFORMANCE_TESTING.md)
- [Known Issues & Technical Debt](../14_DEVELOPMENT_AND_RELEASE/KNOWN_ISSUES.md)
