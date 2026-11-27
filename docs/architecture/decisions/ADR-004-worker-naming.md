# ADR-004: Worker Naming Convention — Preserve `maara-*` Infrastructure Identifiers

**Status:** Proposed
**Date:** 2026-11-27
**Deciders:** Architecture Team
**Tags:** workers, cloudflare, naming, infrastructure

---

## Context

All three Cloudflare Workers use `maara-*` naming in their `wrangler.toml` configurations:

| Worker | Directory | `wrangler.toml` `name` | Purpose |
|---|---|---|---|
| **Tenant Provisioner** | `workers/tenant-provisioner/` | `maara-tenant-provisioner` | Creates tenant DBs, runs migrations |
| **Public CDN** | `workers/public-cdn/` | `maara-public-cdn` | Serves public storefront assets |
| **Taxonomy Sync** | `workers/taxonomy-sync/` | `maara-taxonomy` | Syncs Shopify Global Taxonomy |

All three have **verified bindings** (KV namespaces, R2 buckets, D1 databases, service bindings) but use **placeholder IDs** (e.g., `id = "xxx"`).

---

## Evidence

From [Session C Offline Audit Report, Section 4.4 (Worker Naming)](../session-c-offline-audit.md#44-worker-naming-c4):

- **`maara-*` is established infrastructure identifier** — not a code convention
- **All three workers follow same pattern** — consistent across provisioning, CDN, taxonomy
- **Bindings verified** — each `wrangler.toml` has correct binding types (KV, R2, D1, service)
- **Placeholder IDs only** — no production IDs committed (correct security practice)

### Worker Configurations

**Tenant Provisioner** (`workers/tenant-provisioner/wrangler.toml`):
```toml
name = "maara-tenant-provisioner"
main = "src/index.ts"
compatibility_date = "2024-01-01"
[vars] ENVIRONMENT = "production"
[[kv_namespaces]] binding = "TENANT_KV" id = "xxx"
[[d1_databases]] binding = "PLATFORM_DB" database_name = "platform" database_id = "xxx"
[[services]] binding = "TAXONOMY_SYNC" service = "maara-taxonomy"
```

**Public CDN** (`workers/public-cdn/wrangler.toml`):
```toml
name = "maara-public-cdn"
main = "src/index.ts"
[[kv_namespaces]] binding = "CDN_KV" id = "xxx"
[[r2_buckets]] binding = "ASSETS_BUCKET" bucket_name = "assets" id = "xxx"
```

**Taxonomy Sync** (`workers/taxonomy-sync/wrangler.toml`):
```toml
name = "maara-taxonomy"
main = "src/index.ts"
[[kv_namespaces]] binding = "TAXONOMY_KV" id = "xxx"
[[d1_databases]] binding = "COMMERCE_DB" database_name = "commerce" database_id = "xxx"
```

---

## Decision Options

### Option 1: Preserve `maara-*` Names (Recommended)
- **Decision:** Keep existing `maara-*` identifiers as-is
- **Action:** No renaming; only replace placeholder IDs with real ones at deploy time
- **Pros:** Consistency, deployed infrastructure may already reference these names, zero risk
- **Cons:** Name doesn't match project name "zerocraft"

### Option 2: Rename to `zerocraft-*` or Project-Aligned Names
- **Decision:** Change all three worker names to match project branding
- **Action:** Update `wrangler.toml` `name` fields, update service bindings, redeploy
- **Pros:** Brand consistency
- **Cons:** **Breaking change** — deployed workers, service bindings, DNS, monitoring all reference `maara-*`; requires coordinated redeploy

### Option 3: Dual Naming — Internal `maara-*`, External `zerocraft-*`
- **Decision:** Keep internal infrastructure names, add external aliases
- **Action:** Use Cloudflare Workers custom domains / routes for external naming
- **Pros:** Best of both worlds
- **Cons:** Added complexity, still need to manage internal names

---

## Recommendation

**Option 1: Preserve `maara-*` Names**

### Rationale

1. **Infrastructure identifiers ≠ code conventions** — `maara-*` appears to be an established platform/infrastructure namespace (possibly predating "zerocraft" branding)
2. **Service bindings reference these names** — `maara-tenant-provisioner` binds to `maara-taxonomy` service; renaming breaks cross-worker calls
3. **Deployed infrastructure exists** — Cloudflare dashboard, logs, monitoring, alerts all keyed to `maara-*`
4. **Zero benefit to rename** — no technical advantage; pure cosmetics with high risk
5. **Placeholder IDs are correct** — real IDs injected at deploy time via CI/CD secrets (not in repo)

### Concrete Actions

1. **No code changes to worker names**
2. **Document in `workers/README.md`:**
   ```markdown
   ## Worker Naming Convention
   
   All workers use `maara-*` prefix — this is the **infrastructure namespace**, not project branding.
   - Do not rename to `zerocraft-*` — breaks service bindings and deployed infrastructure
   - Real KV/R2/D1 IDs injected at deploy via GitHub secrets
   - Placeholder `id = "xxx"` in wrangler.toml is intentional (security)
   ```
3. **Ensure CI/CD injects real binding IDs** — verify deployment pipeline replaces placeholders

---

## Consequences

### Positive
- Zero deployment risk
- Service bindings continue working
- Existing monitoring/alerting unaffected
- Infrastructure team recognizes these names

### Negative
- Naming doesn't match "zerocraft" project brand
- New team members may question the prefix

### Risks
- **None** — this is status quo with documentation

---

## Open Questions

1. **What does `maara` refer to?** Internal platform name? Previous project name? Understanding origin helps document intent.

2. **Are these workers already deployed to production/staging?** If yes, renaming is definitively off the table.

3. **Is there a plan to add more workers?** If so, should new workers follow `maara-*` or a new convention? Recommend: follow existing `maara-*` for consistency.

4. **Service binding `TAXONOMY_SYNC` → `maara-taxonomy`** — is this the only cross-worker binding? Audit shows yes.

---

## Related

- [Migration Plan: Worker Naming](../migration-plan.md#session-c-6-worker-naming-convention)
- [Session C Audit: Worker Evidence](../session-c-offline-audit.md#44-worker-naming-c4)
- Cloudflare Workers docs: [Service Bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)