# Companio AI System Overview

**Owner category:** AI Engineering  
**Status:** Current architectural overview based on inspected source and subsystem docs  
**Last verified:** 2026-11-12

## Responsibilities

AI-related services participate in voice interaction, structured dialogue and report narration. Clinical risk detection also includes a deterministic rules path; it must not depend solely on language-model output.

## High-level interaction

1. Patient begins a voice check-in after applicable consent checks.
2. Voice gateway receives audio and integrates with the configured speech-to-text provider.
3. Dialogue orchestration uses the configured Gemini integration and structured application workflows.
4. Structured observations are validated and stored with provenance.
5. Deterministic safety processing evaluates relevant patient statements against the configured taxonomy.
6. Reports use deterministic metric calculations; model narration is constrained to supplied report data and validated output.
7. Text-to-speech may render spoken responses using the configured provider.

See [voice state machine](VOICE_SESSION_STATE_MACHINE.md), [clinical dialogue](CLINICAL_DIALOGUE_ARCHITECTURE.md), [clinical safety](CLINICAL_SAFETY_ARCHITECTURE.md) and [deterministic reporting](DETERMINISTIC_REPORTING_ARCHITECTURE.md).

## Model guardrails

- The model is not the authority for diagnosis, prescribing or clinical disposition.
- Structured tool calls must be validated by application schemas and authorization.
- Clinical metrics are calculated deterministically, not invented by narration.
- RED severity cannot be silently downgraded by generated text.
- Patient correction and confirmation states must be preserved.
- Missing, declined and unknown data must not be fabricated or treated as zero.

## Provider status

The repository uses AssemblyAI, Google Generative AI and ElevenLabs packages. Provider contractual and data-processing eligibility is tracked separately in [Phase 12.2 provider closure](PHASE_12_2_PROVIDER_CLOSURE.md). SDK presence does not establish approval to process PHI.

## Limitations

This overview is not a prompt inventory or safety certification. Inspect the agent implementation and test results before changing behavior.