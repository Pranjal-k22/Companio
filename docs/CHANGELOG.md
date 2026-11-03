# Changelog

All notable changes to the Companio healthcare platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-11-03

### Added
- **Multi-Tenant SaaS Architecture**: Complete tenant isolation across hospitals, health systems, and clinics.
- **Core Multi-Tenancy Models**: Added `Organization`, `Membership`, `Team`, and `Invitation` schemas with compound indexes.
- **Tenant Scoping on Domain Models**: Added `organizationId` and compound indexes across `Patient`, `Checkin`, `Conversation`, `Flag`, `Report`, `Appointment`, `LabResult`, and `EscalationEvent`.
- **Database Migration Framework**: Created safe, idempotent migration engine (`server/src/migrations/`) supporting `--dry-run`, `--execute`, and `--verify`. Successfully migrated legacy data to `Metro Senior Health Partners`.
- **Tenant Context Resolution Middleware**: Created `server/src/middleware/tenantContext.js` verifying database memberships and attaching `req.tenant`.
- **Granular RBAC/ABAC Policy Engine**: Added catalog of 28 granular permissions (`server/src/constants/permissions.js`), `requirePermission`, and `requireCareTeamOrSelf` middleware (`server/src/middleware/tenantAuthorization.js`).
- **Care Team Scoping**: Implemented multi-disciplinary clinical teams with primary clinician assignments and patient membership mapping.
- **Cryptographic Invitations**: Secure organization invitations using 32-byte cryptographically random SHA-256 tokens with single-use redemption and expiration.
- **Multi-Tenancy REST APIs**: Added endpoints for organizations, teams, memberships, invitations, and active tenant switching under `/api/v1/organizations`.
- **Tenant-Partitioned Voice Gateway**: Scoped Socket.io `/voice` namespace connections to verified organization memberships and isolated room broadcasting (`org:${orgId}:patient:${patientId}`).
- **Tenant-Partitioned Background Workers**: Re-engineered `weeklyReportWorker.js` to process patient cohorts partitioned strictly by tenant with independent metric generation.
- **Frontend Multi-Tenant Integration**: Updated `client/src/services/api.js` and `client/src/context/AuthContext.jsx` with active organization state and organization switcher support.
- **Automated Multi-Tenancy Test Suite**: Created `server/src/testMultiTenancy.js` with 20 comprehensive security checks validating cross-tenant 404 concealment, membership verification, and care team boundaries.
- **Architectural & Security Documentation**: Authored `docs/ORGANIZATION_ARCHITECTURE.md`, `docs/MULTI_TENANCY_SECURITY.md`, `docs/DATABASE_MIGRATION_PHASE_2.md`, and `docs/RBAC_PERMISSION_MATRIX.md`.

### Changed
- Updated `User.js` schema to support the `CAREGIVER` role.
- Updated report generation service (`server/src/services/reportGenerator.js`) to inherit tenant scoping and isolate trend calculations.
- Updated OpenAPI specification (`docs/openapi.yaml`) and API reference (`docs/API_REFERENCE.md`) with organization and team management schemas.

### Security
- **404 Concealment**: Enforced strict `404 Not Found` responses when querying cross-tenant records to prevent resource enumeration attacks.
- **Zero Client Trust**: All tenant context is verified against active database memberships rather than client-supplied headers.

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

