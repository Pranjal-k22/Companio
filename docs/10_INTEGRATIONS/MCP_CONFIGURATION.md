# Companio MCP & Developer AI Tooling Configuration Guide

## Document Purpose
Defines approved Model Context Protocol (MCP) and local AI coding assistant configuration patterns for working on the Companio repository safely (Orvanta Blueprint Prompt 12).

## Scope
Covers local developer MCP servers (filesystem, git, container inspection, read-only schema/doc checks) and strict prohibitions against connecting MCP tooling to live patient databases or embedding production API keys.

## Status
- **Repository Configuration Policy:** `IMPLEMENTED` (no hardcoded `.mcp.json` secrets exist in repo)
- **Live Clinical DB / Production SaaS MCP Bridges:** **PROHIBITED** during synthetic-only pilot gate

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [.gitignore](../../.gitignore)
- [.env.example](../../.env.example)
- [AI_AGENTS.md](../../AI_AGENTS.md)

---

## 1. Security & Governance Rules for MCP Servers

1. **Zero Secret Material in Config Files:** Never commit API keys (`GEMINI_API_KEY`, `ASSEMBLYAI_API_KEY`, `ELEVENLABS_API_KEY`, `TWILIO_AUTH_TOKEN`, `RESEND_API_KEY`, `JWT_SECRET`, `REID_SECRET_PEPPER`, or `MONGODB_URI`) into `.mcp.json`, editor settings, or project JSON manifests.
2. **Local Synthetic Databases Only:** Any database/Redis MCP server attached for debugging MUST point strictly to ephemeral local development instances (`localhost:27017` / `localhost:6379`) containing synthetic seed data (`npm run seed`).
3. **Never Bypass Clinical & Security Tests:** AI tools invoked through IDE or MCP sessions must never mock away clinical safety checks, suppress failing verification suites, or edit `ConsentRecord` / `CaregiverAccessEvent` immutability guards.
4. **No Outbound PHI in Prompt Context:** Keep `.env`, `.env.*`, database dumps, and patient transcripts excluded from external MCP upload tools.

---

## 2. Recommended Safe Local MCP Pattern (Non-Secret Example)

```json
{
  "mcpServers": {
    "filesystem-companio": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:/WEB DEVELOPMENT/Companio"]
    }
  }
}
```
*(No `.mcp.json` file is tracked in Git; developers supply credentials solely via ignored local `.env` runtime environments.)*

---

## 3. Related Documentation
- [../../AI_AGENTS.md](../../AI_AGENTS.md)
- [INTEGRATIONS.md](./INTEGRATIONS.md)
- [PHI_HANDLING.md](../09_SECURITY_AND_PRIVACY/PHI_HANDLING.md)
