# Companio Docker & Containerization Guide

## Document Purpose
Documents Companio's Docker multi-service topology (`docker-compose.yml`), multi-stage frontend/backend image definitions (`Dockerfile.server`, `Dockerfile.client`), and known container build caveats.

## Scope
Covers the 5 Compose services (`mongodb`, `redis`, `server`, `worker`, `client`) and their build contexts, health checks, and port bindings.

## Status
- **Docker Definitions Present:** `IMPLEMENTED` (`docker-compose.yml`, `Dockerfile.server`, `Dockerfile.client`)
- **Production Container Hardening Verification:** `NOT VERIFIED` (`Dockerfile.server` context note below)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [docker-compose.yml](../../docker-compose.yml)
- [Dockerfile.server](../../Dockerfile.server)
- [Dockerfile.client](../../Dockerfile.client)

---

## 1. Compose Service Matrix (`docker-compose.yml`)

| Service | Image / Build | Port Mapping | Role & Persistence |
| :--- | :--- | :--- | :--- |
| `mongodb` | `mongo:6.0` | `27017:27017` | Primary persistent clinical & audit store (named volume) |
| `redis` | `redis:7-alpine` | `6379:6379` | `--appendonly yes` durable BullMQ message broker |
| `server` | `Dockerfile.server` (`node:20-alpine`, `USER node`) | `5000:5000` | Express API & `/voice` Socket.IO gateway |
| `worker` | `Dockerfile.server` (`WORKER_ONLY=true`) | — | Dedicated background queue consumer cluster |
| `client` | `Dockerfile.client` (Nginx SPA) | `5173:80` | Built React SPA + static asset caching |

---

## 2. Build Context Caveat (`Dockerfile.server`)

- **Observed Dependency Linkage:** `server/package.json` includes `"companio-monorepo": "file:.."` while `Dockerfile.server` copies package manifests and runs `npm ci --prefix server`. If the parent root manifest is omitted from the build context stage before `npm ci`, container dependency resolution should be tested prior to CI rollout. Tracked in [KNOWN_ISSUES.md](../14_DEVELOPMENT_AND_RELEASE/KNOWN_ISSUES.md).

---

## 3. Related Documentation
- [SETUP.md](./SETUP.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [KNOWN_ISSUES.md](../14_DEVELOPMENT_AND_RELEASE/KNOWN_ISSUES.md)
