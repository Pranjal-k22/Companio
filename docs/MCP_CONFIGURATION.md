# Companio MCP Configuration Guidance

**Owner category:** Developer Tooling and Security  
**Status:** Guidance only; this document does not create an MCP connection  
**Last verified:** 2026-11-12

## Purpose

Model Context Protocol (MCP) can expose approved development tools or read-only project context to coding assistants. It is not required by the Companio runtime.

## Security requirements

- Use trusted MCP servers from known publishers.
- Prefer read-only permissions for repository inspection, documentation and test artifact review.
- Do not expose production databases, real patient records, live Redis, provider secrets or unrestricted shell access to an AI assistant.
- Do not commit API keys or credentials.
- Store local secrets outside Git using the editor's supported secret mechanism.
- Restrict filesystem access to the project workspace.
- Review requested capabilities before enabling a server.
- Revoke access when no longer required.

No live server definition is provided because an approved MCP provider, executable path and scope were not verified as a Companio standard. Local configuration should follow the editor's current schema and remain untracked if it contains local paths or secrets.