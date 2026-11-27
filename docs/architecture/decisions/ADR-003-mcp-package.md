# ADR-003: MCP Package (@zerocraft/mcp) — Keep as Available but Unused

**Status:** Proposed
**Date:** 2026-11-27
**Deciders:** Architecture Team
**Tags:** mcp, ai-integration, package, disposition

---

## Context

The `@zerocraft/mcp` package exists at `packages/mcp/` — a compiled, tested Model Context Protocol server for AI assistant integration with organization-scoped data access.

### Package State

| Aspect | Status |
|---|---|
| **Build** | ✅ Compiles — `dist/index.js` exists |
| **Exports** | `confirmation`, `policy`, `redaction`, `server`, `supabase-gateway`, `types` |
| **Tests** | ✅ Unit tests pass (`npm test` in package) |
| **Dependencies** | `@modelcontextprotocol/sdk`, `zod`, `@zerocraft/utils` |
| **Usage in codebase** | ❌ **Zero imports** in apps/admin, workers, templates |
| **Documentation** | README exists, describes org-scoped data access for AI assistants |

### Architecture

```
MCP Server (packages/mcp)
├── confirmation      — User confirmation flows
├── policy            — Authorization policies
├── redaction         — PII/sensitive data redaction
├── server            — MCP server entry point, tool registration
├── supabase-gateway  — Org-scoped Supabase queries
└── types             — Shared TypeScript types
```

### Intended Purpose

From package README and code:
- **Org-scoped data access** — AI assistants query tenant data via Supabase with RLS
- **Tool registration** — Exposes admin operations as MCP tools
- **Redaction** — Strips sensitive fields before returning to AI
- **Policy/Confirmation** — Guardrails for destructive operations

---

## Evidence

From [Session C Offline Audit Report, Section 4.3 (MCP Package)](../session-c-offline-audit.md#43-mcp-package-c3):

- **Fully built and tested** — not vaporware
- **Zero integration** — no wiring in admin app, workers, or templates
- **No CLI entry** — no `bin` field in package.json, no startup script
- **No deployment config** — no Dockerfile, no Cloudflare Worker wrangler, no fly.io config
- **Dependencies on internal packages** — `@zerocraft/utils` (which has its own issues per ADR-001)

### Key Observations

1. **Investment exists** — someone built this intentionally with proper structure
2. **No consumer** — nothing calls it; admin app uses REST/tRPC, not MCP
3. **No deployment path** — can't run as-is without infrastructure work
4. **Architectural fit** — MCP is for AI-to-system integration; current product is human-admin UI

---

## Decision Options

### Option 1: Keep as Available, Document Status (Recommended)
- **Decision:** Package stays in repo, marked as "available but not integrated"
- **Action:** Add `STATUS.md` or update README with clear status badge
- **Action:** No code changes; no deletion
- **Pros:** Preserves investment, ready if AI integration becomes priority, zero risk
- **Cons:** Dead code in repo, maintenance burden (deps, tests), confusion for newcomers

### Option 2: Archive/Delete Package
- **Decision:** Remove `packages/mcp/` entirely
- **Action:** Delete directory, remove from workspace
- **Pros:** Clean repo, no maintenance
- **Cons:** Loses completed work, hard to recover if needed later

### Option 3: Integrate into Admin App
- **Decision:** Wire MCP server as admin feature
- **Action:** Add deployment (Cloudflare Worker / Docker), connect to admin backend
- **Action:** Build AI assistant UI in admin to consume it
- **Pros:** Realizes original vision, differentiates product
- **Cons:** **Major effort** — new infra, new UI, security review, unclear ROI

### Option 4: Publish to npm as Standalone
- **Decision:** Extract as independent `@zerocraft/mcp` package
- **Action:** Separate repo or npm workspace, publish
- **Pros:** Community use, forces maintenance
- **Cons:** Publishing commitment, versioning, support burden

---

## Recommendation

**Option 1: Keep as Available, Document Status**

### Concrete Actions

1. **Add status documentation** in `packages/mcp/STATUS.md`:
   ```markdown
   # @zerocraft/mcp — Status: Available, Not Integrated

   - **Built:** Yes (dist/index.js)
   - **Tested:** Yes (unit tests pass)
   - **Integrated:** No — zero consumers in codebase
   - **Deployed:** No — no deployment config
   - **Purpose:** MCP server for org-scoped AI assistant data access
   - **Blockers:** No deployment target, no consumer, unclear product priority

   ## To Integrate
   1. Choose deployment target (Cloudflare Worker recommended)
   2. Add wrangler.toml / Dockerfile
   3. Wire into admin app (new "AI Assistant" feature)
   4. Security review for data exposure
   ```

2. **Update `packages/mcp/package.json`** — add `"private": true` to prevent accidental publish

3. **No code changes** — keep tests running in CI

4. **Revisit in 6 months** — if AI integration becomes product priority, this is ready

---

## Consequences

### Positive
- Preserves ~weeks of engineering investment
- Zero risk to current product
- Clear signal to team: "not abandoned, not active"
- Ready foundation if AI features prioritized

### Negative
- Dead code in monorepo (minor)
- Dependency updates needed over time
- Newcomers may wonder why it exists

### Risks
- **Low:** Bitrot — dependencies drift, tests may break silently
- **Low:** Confusion — developers may try to use it expecting integration
- **Medium:** If `@zerocraft/utils` changes (per ADR-001), MCP package needs update

---

## Open Questions

1. **Was this built for a specific customer/partner request?** Understanding origin informs priority.

2. **Is there a product roadmap item for "AI Assistant in Admin"?** If yes, this is pre-work; if no, it's speculative.

3. **Should MCP server run as separate Cloudflare Worker or embedded in admin?** Architecture decision affects deployment complexity.

4. **What's the auth model?** MCP typically uses OAuth; current admin uses Supabase Auth. Integration needs design.

5. **Are there security implications?** Exposing org data via MCP tools needs careful scope/redaction review.

---

## Related

- [ADR-001: Money Representation](./ADR-001-money-representation.md) — `@zerocraft/utils` dependency has its own ADR
- [Migration Plan: MCP Package](../migration-plan.md#session-c-5-mcp-package-disposition)
- [Session C Audit: MCP Evidence](../session-c-offline-audit.md#43-mcp-package-c3)