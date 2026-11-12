# Companio Database Guide

**Owner category:** Backend Engineering  
**Status:** Summary; model-by-model reference remains [BACKEND_SCHEMA.md](BACKEND_SCHEMA.md)  
**Last verified:** 2026-11-12

## Technology

The backend uses MongoDB with Mongoose. Connection configuration is under `server/src/config/`; actual models are under `server/src/models/`.

## Domain areas

Representative models inspected include:
- Identity and access: `User`, `Organization`, `Membership`, `Team`, `Invitation`.
- Patient and wellness: `Patient`, `Checkin`, `Conversation`, `DialogueSession`, `Observation`.
- Safety and escalation: `Flag`, `SafetyRule`, `EscalationEvent`.
- Reporting: `Report` and related evidence/attestation records.
- Privacy: `ConsentRecord`.
- Caregiver delegation: `CaregiverRelationship`, access grants, concerns and access events.

This is not a complete generated schema inventory. Consult [BACKEND_SCHEMA.md](BACKEND_SCHEMA.md) and individual model files for fields, indexes and validation.

## Data integrity rules

- Scope tenant-owned records by `organizationId` and relevant patient/resource identifiers.
- Preserve source, confidence and correction/retraction provenance for observations.
- Keep consent history auditable; do not mutate historical consent events during ordinary workflows.
- Follow report lifecycle and attestation rules.
- Notification failure must not delete or resolve clinical flags.
- Retention and deletion must follow approved policy and legal requirements.

## Privacy

Treat patient profile, health observations, dialogue transcripts, consent, flags, reports and caregiver submissions as sensitive. Use synthetic records in ordinary development and tests.