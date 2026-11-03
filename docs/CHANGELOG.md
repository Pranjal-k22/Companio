# Changelog

All notable changes to the Companio healthcare platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-11-03

### Added
- **API Versioning**: Introduced `/api/v1` namespace across all REST endpoints with zero-downtime `/api` backwards-compatibility aliases.
- **RFC 9457 Problem Details**: Centralized HTTP error handling standardizing error codes, types, instances, and validation failure details.
- **Request Correlation Tracking**: End-to-end `X-Request-Id` UUID v4 generation and propagation middleware.
- **Domain Validation Schemas**: Comprehensive Zod schemas in `server/src/validators/` protecting authentication, patient rosters, daily check-ins, flags, reports, appointments, and diagnostic labs.
- **Standardized Response Helper**: `sendSuccess` helper delivering standard `{ success, data, pagination, meta }` payloads with legacy root-property mirroring.
- **Security Hardening**: Integrated `helmet` security headers and `express-rate-limit` protection on authentication routes.
- **Client API Standardization**: Updated frontend API client (`client/src/services/api.js`) targeting `/api/v1` with automated client-side request ID generation and senior-friendly error normalization.
- **Phase 1 Automated Verification Suite**: Created `server/src/testPhase1Standards.js` verifying 17 foundational standards across 6 test categories.
- **OpenAPI 3.1 Specification**: Created `docs/openapi.yaml` documenting all versioned endpoints, security schemes, and data models.
- **Architectural Documentation**: Added `docs/API_REFERENCE.md` and `docs/ARCHITECTURE.md`.

### Changed
- Standardized error throwing in `auth.js` and `roles.js` to dispatch `AuthenticationError` and `AuthorizationError` to the RFC 9457 error handler.
- Upgraded Gemini LLM model identifier to `gemini-3.8-flash` with dual-stage failover to `gemini-2.5-flash` and deterministic fallback templates.

### Fixed
- Resolved ZodError mapping to handle both `.issues` and `.errors` gracefully.
- Maintained 100% backwards compatibility for legacy frontend consumers.
