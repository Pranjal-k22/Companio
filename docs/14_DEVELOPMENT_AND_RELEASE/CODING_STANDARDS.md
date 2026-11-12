# Companio Engineering Coding Standards

## Document Purpose
Defines codebase conventions observed across Companio's ES-module Express backend (`server/`) and Vite/React frontend (`client/`).

## Scope
Covers backend modular patterns, Zod request validation, multi-tenant query scoping, error classes, structured logging, and frontend component/token rules.

## Status
- **Backend Conventions:** `IMPLEMENTED`
- **Automated Frontend Linter Enforcement:** `PARTIALLY IMPLEMENTED` (`eslint` script declared in `client/package.json` without `eslint` installed)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/middleware/validate.js](../../server/src/middleware/validate.js)
- [server/src/errors/AppError.js](../../server/src/errors/AppError.js)
- [server/src/utils/logger.js](../../server/src/utils/logger.js)
- [client/src/App.jsx](../../client/src/App.jsx)
- [COMPONENT_GUIDELINES.md](../02_DESIGN/COMPONENT_GUIDELINES.md)

---

## 1. Backend Standards (`server/`)

- **ES Modules (`"type": "module"`):** Use explicit `.js` extensions on relative imports.
- **Route -> Validator -> Service -> Model Layering:** Validate request `body`/`query`/`params` with Zod (`validateRequest`), throw domain subclasses of `AppError` (never raw string errors), and keep multi-tenant queries scoped by `organizationId`.
- **Safe Logging:** Log through `server/src/utils/logger.js` with `req.id` correlation; never log raw transcripts, tokens, emails, phones, or passwords.
- **Non-Destructive Clinical History:** Preserve audit lineage via `supersedesObservationId`, `supersedesReportId`, and append-only `ConsentRecord` / `CaregiverAccessEvent` writes.

---

## 2. Frontend Standards (`client/`)

- **Design Tokens & Accessibility:** Reference semantic color/spacing tokens defined in `client/tailwind.config.js` / CSS variables; keep touch targets >= 48px and contrast verified via `npm run check:contrast`.
- **Route Splitting:** Maintain `React.lazy(...)` route-level lazy loading (`client/src/App.jsx`).
- **Clinical Caution:** Never display diagnostic diagnoses, dose change suggestions, or emergency-red styling on routine patient warning chips.

---

## 3. Related Documentation
- [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)
- [DESIGN_SYSTEM.md](../02_DESIGN/DESIGN_SYSTEM.md)
- [API_CONTRACT.md](../05_API/API_CONTRACT.md)
