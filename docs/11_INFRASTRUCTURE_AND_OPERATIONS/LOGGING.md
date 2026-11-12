# Companio Structured Logging & PHI Redaction Specification

## Document Purpose
Documents Companio's actual runtime logging implementation (`server/src/utils/logger.js`), request correlation pipeline, and automated field/string redaction rules—resolving historical references to Winston.

## Scope
Covers `server/src/utils/logger.js` and `server/src/middleware/requestContext.js`.

## Status
- **Implementation Status:** `IMPLEMENTED` (`Logger` custom class verified directly on `2026-11-12`)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/utils/logger.js](../../server/src/utils/logger.js)
- [server/src/middleware/requestContext.js](../../server/src/middleware/requestContext.js)
- [server/package.json](../../server/package.json)

---

## 1. Implementation Reality (`Logger` vs. Winston)

- **Code Fact:** `server/src/utils/logger.js` implements a **zero-dependency custom ES class (`Logger`)** emitting structured output directly to Node `console.log`/`console.error`/`console.warn`. `winston` is **not** installed in `server/package.json`.
- **Discrepancy Note:** Earlier Phase 12.2.1 narrative notes briefly mentioned Winston logger configuration; engineers and operators must treat `server/src/utils/logger.js` as the single source of truth.

---

## 2. Correlation & Redaction Guarantees

- **Request Correlation:** `requestContext.js` injects/propagates UUID v4 `X-Request-Id` (`req.id`) so all REST errors and async worker hops trace cleanly.
- **PII & Secret Scrubbing:** `logger.js` walks metadata objects recursively and strips/masks sensitive properties (passwords, JWTs, phone numbers, email addresses, transcripts) as well as regex-matched identifiers in log messages before writing to stdout/stderr.

---

## 3. Related Documentation
- [AUDIT_LOGGING.md](../09_SECURITY_AND_PRIVACY/AUDIT_LOGGING.md)
- [MONITORING.md](./MONITORING.md)
- [KNOWN_ISSUES.md](../14_DEVELOPMENT_AND_RELEASE/KNOWN_ISSUES.md)
