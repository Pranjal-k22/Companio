# Companio API and Service Error Handling

**Owner category:** Backend Engineering  
**Status:** Guidance; verify against current error middleware before implementation changes  
**Last verified:** 2026-11-12

## API conventions

The route registry is `server/src/routes/index.js`. It documents the versioned `/api/v1` namespace and backward-compatible `/api` alias. Preserve compatibility unless a migration is approved.

## Expected behavior

- Validate route parameters, query strings and request bodies with established schemas.
- Use application error classes and centralized error handling.
- Follow response formats and status codes in [API_REFERENCE.md](API_REFERENCE.md).
- Include request/correlation IDs where available.
- Do not return stack traces, secrets, tokens, provider payloads or clinical transcript content to clients.
- Distinguish validation, authentication, authorization, not found, conflict, rate limit, dependency outage and unexpected server failures.
- Follow cross-tenant concealment behavior where implemented.

## Background jobs

Retryable provider or infrastructure errors should use established queue retry policies. Retry or final delivery failure must not mutate the underlying clinical flag to resolved. Escalation event records remain the operational audit source.

## Logging

Use the centralized logger. Avoid ad-hoc logging of sensitive payloads. Redaction is defense in depth, not permission to log raw PHI.