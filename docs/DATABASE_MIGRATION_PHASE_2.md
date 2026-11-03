# 🗄️ Database Migration Guide — Phase 2 Multi-Tenancy

**Document Reference**: `docs/DATABASE_MIGRATION_PHASE_2.md`  
**Migration ID**: `001_phase2_multi_tenancy`  
**Migration Engine**: `server/src/migrations/`  
**Status**: Executed & Verified in Production Baseline  

---

## 1. Migration Overview

The Phase 2 database migration converts legacy single-tenant Companio collections into a multi-tenant scoped architecture by:
1. Creating or identifying the primary demonstration organization (`Metro Senior Health Partners`, slug: `demo-health-system`).
2. Creating scoped `Membership` documents for all existing user accounts based on verified historical roles (`ADMIN` -> `ORG_OWNER`, `CLINICIAN` -> `CLINICIAN`, `PATIENT` -> `PATIENT`).
3. Backfilling `organizationId` across all 8 tenant-owned collections.
4. Creating compound performance indexes on `{ organizationId: 1, ... }`.

---

## 2. CLI Usage

The migration runner is located at `server/src/migrations/index.js`:

```powershell
# 1. Run simulation without writing to database
node server/src/migrations/index.js --dry-run

# 2. Execute live migration with immediate post-migration verification
node server/src/migrations/index.js --execute

# 3. Audit current database state for unassigned tenant records
node server/src/migrations/index.js --verify
```

---

## 3. Migration Execution Log & Baseline Summary

```
--- RUNNING MIGRATION (LIVE EXECUTION) ---
[Migration 001] [EXECUTE] Starting Phase 2 Multi-Tenancy Data Migration...
[Migration 001] [EXECUTE] Target Organization: Metro Senior Health Partners (6ae9b474cda7083ae5d4f90d)
[Migration 001] [EXECUTE] Auditing 4 existing user account(s) for organization membership...
[Migration 001] [EXECUTE] Enrolling user sjenkins@healthclinic.org as CLINICIAN in organization demo-health-system
[Migration 001] [EXECUTE] Enrolling user robert.miller@example.com as PATIENT in organization demo-health-system
[Migration 001] [EXECUTE] Enrolling user eleanor.vance@example.com as PATIENT in organization demo-health-system
[Migration 001] [EXECUTE] Enrolling user arthur.p@example.com as PATIENT in organization demo-health-system

[Migration 001] [EXECUTE] Collection 'Patients': successfully assigned 3 document(s).
[Migration 001] [EXECUTE] Collection 'Checkins': successfully assigned 41 document(s).
[Migration 001] [EXECUTE] Collection 'Conversations': successfully assigned 56 document(s).
[Migration 001] [EXECUTE] Collection 'Flags': successfully assigned 25 document(s).
[Migration 001] [EXECUTE] Collection 'Reports': successfully assigned 17 document(s).
[Migration 001] [EXECUTE] Collection 'Appointments': successfully assigned 5 document(s).
[Migration 001] [EXECUTE] Collection 'LabResults': successfully assigned 3 document(s).
[Migration 001] [EXECUTE] Collection 'EscalationEvents': successfully assigned 18 document(s).

--- POST-MIGRATION VERIFICATION ---
┌─────────────────┬────────────┬───────┐
│ (index)         │ unassigned │ valid │
├─────────────────┼────────────┼───────┤
│ Patient         │ 0          │ true  │
│ Checkin         │ 0          │ true  │
│ Conversation    │ 0          │ true  │
│ Flag            │ 0          │ true  │
│ Report          │ 0          │ true  │
│ Appointment     │ 0          │ true  │
│ LabResult       │ 0          │ true  │
│ EscalationEvent │ 0          │ true  │
└─────────────────┴────────────┴───────┘
```

---

## 4. Rollback & Recovery Strategy

1. **Idempotence**: The migration queries specifically for `{ $or: [{ organizationId: null }, { organizationId: { $exists: false } }] }`. Re-running the script is safe and non-destructive.
2. **Rollback Script**: If an emergency rollback is required, documents retain original IDs and timestamps. Removing `organizationId` or querying documents created prior to migration timestamp restores legacy behavior.
3. **Database Backup**: Standard mongodump snapshots are captured prior to production cluster migrations.
