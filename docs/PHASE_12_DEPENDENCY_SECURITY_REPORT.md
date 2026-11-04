# COMPANIO — PHASE 12: DEPENDENCY SECURITY & AUDIT REPORT
## Multi-Tier Software Supply Chain Vulnerability Assessment

**Author:** Senior Platform Security Engineer  
**Date:** 2026-11-04  
**Audit Scope:** Monorepo Root, Server Backend Runtime, and Client Frontend Web Application  

---

## 1. Executive Dependency Summary

| Tier | Direct Dependencies | Transitive Dependencies | Production Vulnerabilities | Dev Vulnerabilities | Status |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Root Monorepo** | 4 | 28 | 0 | 0 | **PASS** |
| **Server Backend** | 21 | 184 | 0 | 0 | **PASS** |
| **Client Frontend** | 5 | 112 | 0 | 5 (Dev Build Tools) | **ACCEPTED RESIDUAL RISK** |

---

## 2. Server Runtime Dependency Audit (`server/package.json`)

The server runtime runs on **Node.js 20 LTS** in a multi-stage Alpine Linux container (`node:20-alpine`) executing as non-root `USER node`.

### Core Production Dependencies Reviewed:
- `express` (v4.19.2): Hardened with `helmet` (v8.3.0) and RFC 9457 Problem Details error handling.
- `helmet` (v8.3.0): Enforces HTTP security headers (HSTS, X-Content-Type-Options, X-Frame-Options).
- `express-rate-limit` (v8.7.3): Provides IP rate limiting on auth and sensitive routes.
- `bcryptjs` (v3.0.3): Implements secure bcrypt hashing with work factor 10.
- `jsonwebtoken` (v9.0.3): HMAC-SHA256 token verification with active user checks.
- `mongoose` (v8.4.1): Strict schema typing with parameterization against NoSQL injection.
- `zod` (v4.6.7): Input validation on all HTTP request bodies, params, queries, and environment variables.
- `ioredis` (v5.11.1) & `bullmq` (v6.6.0): Distributed background queue engine with TLS and Sentinel support.
- `socket.io` (v4.7.5): Real-time voice WebSocket gateway with JWT authentication and frame size caps.

**Server Audit Finding**: **ZERO CRITICAL, HIGH, OR MODERATE PRODUCTION VULNERABILITIES DETECTED.**

---

## 3. Client Build Pipeline Dependency Audit (`client/package.json`)

Running `npm audit` on the client directory identified 5 advisories in development / compile-time dependencies:

### Advisory Breakdown:

#### 1. `source-map-js` (v1.0.0 – v1.2.1)
- **Severity**: High (CVSS 7.5)
- **Advisory**: [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)
- **Type**: Transitive dependency (via `postcss` ➔ `tailwindcss`).
- **Mechanism**: Event-loop denial of service through indexed source-map section offsets during local compilation.
- **Runtime Exploitability**: **ZERO**. This package does not run in the browser or on the production server. It executes only during local build time (`npm run build`).

#### 2. `follow-redirects` (v1.16.0 – v1.16.1)
- **Severity**: High (CVSS 7.5)
- **Advisory**: [GHSA-q3jh-wrc6-jgq8](https://github.com/advisories/GHSA-q3jh-wrc6-jgq8)
- **Type**: Transitive dependency (via dev tooling).
- **Mechanism**: Sensitive headers regex escaping in Node HTTP redirect handling.
- **Runtime Exploitability**: **ZERO**. Production client is a static Single Page Application (SPA) compiled into vanilla HTML/JS/CSS and served via Nginx. It never runs Node.js redirect logic in production.

#### 3. `esbuild` (<=v0.24.2) via `vite` (<=v6.4.3)
- **Severity**: Moderate (CVSS 5.3)
- **Advisory**: [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)
- **Type**: Direct devDependency (`vite` 5.4.21).
- **Mechanism**: Development server cross-origin request handling when running `npm run dev`.
- **Runtime Exploitability**: **ZERO**. The Vite dev server is strictly prohibited from running in production. Production artifacts are static Nginx assets.

#### 4. `postcss-selector-parser` (<v6.1.5)
- **Severity**: Moderate (CVSS 5.3)
- **Advisory**: [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)
- **Type**: Transitive dependency (via `tailwindcss` / `postcss`).
- **Mechanism**: Flat selector CPU complexity during CSS minification.
- **Runtime Exploitability**: **ZERO**. Build-time CSS compilation only.

---

## 4. Exploitability & Residual Risk Decision

### Why Blind `npm audit fix --force` is Prohibited:
Running `npm audit fix --force` would forcibly install `vite@8.x`, introducing breaking changes across Rollup plugins, Tailwind PostCSS configs, and React 18 HMR bindings.

### Formal Security Determination:
- **Production Attack Surface**: None of the 5 flagged packages are packaged into the production bundle (`dist/assets/*.js`) or executed in the production Nginx container.
- **Accepted Residual Risk**: Accepted for local development and CI build pipelines.
- **Remediation Plan**: Schedule a planned Vite 6 / Vite 8 major version upgrade during standard Q1 framework maintenance.
