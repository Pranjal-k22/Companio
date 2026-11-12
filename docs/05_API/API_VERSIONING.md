# Companio API Versioning Strategy

## Document Purpose
Documents URL namespacing, backward-compatibility aliases, and non-breaking evolution conventions for Companio's REST API and real-time event protocol.

## Scope
Covers Express route mounting in `server/src/server.js`, response payload dual compatibility, and future `/api/v2` deprecation criteria.

## Status
- **Implementation Status:** `IMPLEMENTED`
- **Current Version:** `v1` (`/api/v1` primary + `/api` alias)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/server.js](../../server/src/server.js)
- [server/src/routes/index.js](../../server/src/routes/index.js)
- [API_CONTRACT.md](./API_CONTRACT.md)

---

## 1. Dual Mount Strategy

In `server/src/server.js`, the unified `apiRouter` is mounted twice:
```javascript
app.use('/api/v1', apiRouter);
app.use('/api', apiRouter); // Legacy non-breaking alias
```
- All new clients (`client/src/services/api.js`) and documentation target `/api/v1`.
- Existing integration callers using `/api/*` continue operating without breakage until a future formal deprecation notice removes the unversioned mount.

---

## 2. Backward-Compatible Response Evolution

`sendSuccess` and `errorHandler` support both:
- Modern structured envelopes (`{ success, data, pagination, meta }`, RFC 9457 Problem Details)
- Top-level mirrored keys (`token`, `user`, `patients`, `message`, etc.) so incremental UI migrations remain compatible.

Additive fields in JSON payloads are treated as **non-breaking**. Removing fields, altering enum values incompatibly, or changing URL paths requires a `/api/v2` mount.

---

## 3. Related Documentation
- [API_CONTRACT.md](./API_CONTRACT.md)
- [ERROR_HANDLING.md](./ERROR_HANDLING.md)
