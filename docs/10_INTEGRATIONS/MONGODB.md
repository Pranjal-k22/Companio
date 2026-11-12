# MongoDB & Mongoose Integration Specification

## Document Purpose
Documents Companio's MongoDB 6.0 / Mongoose 8.4.1 connection pooling, health checks, seeding entrypoint, and multi-tenant query assumptions.

## Scope
Covers `server/src/config/db.js`, `server/src/models/index.js`, `server/src/seed.js`, and Docker MongoDB setup.

## Status
- **Implementation Status:** `IMPLEMENTED`

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/config/db.js](../../server/src/config/db.js)
- [server/src/models/index.js](../../server/src/models/index.js)
- [server/src/seed.js](../../server/src/seed.js)
- [docker-compose.yml](../../docker-compose.yml)

---

## 1. Connection & Telemetry Integration

- **Driver / ODM:** `mongoose` `8.4.1` targeting MongoDB `6.0`.
- **Environment Variable:** `MONGODB_URI` (`mongodb://localhost:27017/companio` local default).
- **Health Monitoring:** `checkDatabaseHealth()` reports connection state + latency to `/api/v1/health`, `/api/v1/health/ready`, Prometheus gauges (`companio_database_status`, `companio_database_latency_ms`), and `alertEngine.js` (`DATABASE_DISCONNECTED` CRITICAL rule).
- **Deterministic Synthetic Seed:** `npm run seed` populates synthetic organizations, clinicians, patients, caregivers, consents, conversations, check-ins, lab panels, appointments, and safety flags.

---

## 2. Related Documentation
- [DATABASE.md](../04_DATABASE/DATABASE.md)
- [DATA_DICTIONARY.md](../04_DATABASE/DATA_DICTIONARY.md)
- [MONITORING.md](../11_INFRASTRUCTURE_AND_OPERATIONS/MONITORING.md)
