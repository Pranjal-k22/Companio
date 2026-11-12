# Companio Security Overview

**Owner category:** Security Engineering  
**Status:** Current guidance; external assessment remains separate  
**Last verified:** 2026-11-12

## Security principles

- Enforce JWT authentication and server-side role/permission checks.
- Apply organization and patient scoping to applicable data access.
- Enforce caregiver grants on the server and record access events.
- Validate input using established schemas.
- Protect administrative queue and metrics endpoints.
- Keep secrets out of source control.
- Minimize sensitive data in logs, metrics, Redis payloads and notifications.
- Preserve audit records and clinical flags when delivery fails.
- Apply consent checks before voice processing and terminate applicable sessions when consent is withdrawn.

## Current limitations

Internal code review and automated tests are not independent penetration testing. The repository has a penetration-test scope and tracker, but external execution and retest evidence are separate prerequisites.

Do not state that Companio is HIPAA compliant, certified or independently security-certified without current evidence supporting that exact claim.

## Security testing references

- [Phase 11 security assessment](PHASE_11_SECURITY_ASSESSMENT.md)
- [Phase 11 threat model](PHASE_11_THREAT_MODEL.md)
- [Phase 12.2 penetration test tracker](PHASE_12_2_PENETRATION_TEST_TRACKER.md)
- [Phase 10 operational runbooks](PHASE_10_OPERATIONAL_RUNBOOKS.md)
- [AI Agent Rules](AI_AGENT_RULES.md)