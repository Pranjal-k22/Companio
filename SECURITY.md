# Security Policy

Companio's current security guidance and limitations are maintained in [docs/SECURITY.md](docs/SECURITY.md), with supporting threat-model and assessment records in the [documentation index](docs/DOCUMENTATION_INDEX.md).

## Reporting security issues

Do not publish sensitive vulnerability details, patient information, credentials or exploit payloads in public issues. Use the repository owner's established private reporting channel. No security contact address is published here because one was not verified in the repository.

## Security expectations

- Never commit secrets, tokens, certificates, production dumps or patient data.
- Use synthetic fixtures for development and automated testing.
- Keep organization and patient authorization enforced server-side.
- Do not disable consent, clinical safety, caregiver scope or audit controls to work around a defect.
- Treat de-identification as heuristic minimization/pseudonymization unless qualified independent review establishes otherwise.
- Do not claim HIPAA compliance, certification or independent penetration-test completion without evidence.

## Production restrictions

The repository's provider closure and production-readiness records identify external contractual, clinical, ethics and security prerequisites. Do not process real patient PHI through an unapproved provider or deploy to human/clinical cohorts without the required documented approvals.
