# Companio Developer Setup & Quickstart Guide

## Document Purpose
Provides exact step-by-step instructions to install, configure, seed, run, and verify the Companio platform locally (Orvanta Blueprint Prompt 09).

## Scope
Covers Node.js local setup, MongoDB and Redis prerequisites, `.env` initialization, database seeding (`npm run seed`), Vite frontend dev server, Express + worker runtime, and local test suites.

## Status
- **Implementation Status:** `IMPLEMENTED` & `VERIFIED` against `package.json`, `.env.example`, and `seed.js` on `2026-11-12`

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [package.json](../../package.json)
- [server/package.json](../../server/package.json)
- [client/package.json](../../client/package.json)
- [.env.example](../../.env.example)
- [server/src/seed.js](../../server/src/seed.js)

---

## 1. Prerequisites

- **Node.js:** `v20.x` or `v22.x` LTS (tested locally with `v24.20.0` runtime compatibility)
- **MongoDB:** `6.0+` running locally (`mongodb://localhost:27017/companio`)
- **Redis:** `6.2+` / `7-alpine` (optional locally if using in-memory dev queue fallback; required for `test:redis` & live queue drills)

---

## 2. Step-by-Step Local Setup

```bash
# 1. Install root, server, and client dependencies
npm install
npm run install:all

# 2. Configure local environment from template
cp .env.example server/.env
# (or place .env at repo root depending on how you start; check dotenv lookup in server/src/server.js)

# 3. Seed deterministic synthetic clinical data
npm run seed

# 4. Run concurrent client (Vite :5173) and server (Express :5000)
npm run dev
```

*(Individual start commands: `npm run dev:server`, `npm run dev:client`, or `npm run build:client`.)*

---

## 3. Seeded Synthetic Credentials (`server/src/seed.js`)

| Role | Email | Notes |
| :--- | :--- | :--- |
| Org Admin | `admin@companio.health` | Synthetic org administration access |
| Clinician | `clinician@companio.health` | Care-team triage, reporting, and attestation |
| Patient 1 | `patient@companio.health` | Primary synthetic senior profile |
| Patient 2 | `patient2@companio.health` | Secondary synthetic patient profile |
| Caregiver | `caregiver@companio.health` | Delegated synthetic family caregiver |

*Note: Inspect `server/src/seed.js` directly for the local development password constant.*

---

## 4. Verification Smoke Commands

```bash
npm run test:safety
npm run test:dialogue
npm run test:reporting
npm run test:caregivers
npm run test:deid:audit
npm run check:contrast
```

---

## 5. Related Documentation
- [DOCKER.md](./DOCKER.md)
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)
- [TESTING_PLAN.md](../12_TESTING_AND_QUALITY/TESTING_PLAN.md)
