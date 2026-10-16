# Studio Product Local PostgreSQL Validation Plan

Phase: 2.8B.3H-D

Status: discovery and planning only. No database, container, service, migration, SQL session, seed, Auth identity, Storage object, or remote mutation was created or executed during this phase.

## 1. Executive summary

Migration 005 is locally present and its SHA-256 matches the phase brief. Migration 004 also matches its protected checksum. The repository contains the baseline migrations and the new RPC contract, but the Windows development environment has no PostgreSQL client/server binaries, Docker CLI/Desktop, or Supabase CLI discoverable on PATH. No PostgreSQL or Docker service was found, and no relevant listener was found on the common Supabase/PostgreSQL ports.

The preferred future validation environment is a disposable local Supabase stack, because migration 005 depends on Supabase roles, `auth.uid()`, `auth.users`, RLS, Storage policies, and Supabase-compatible extensions. A standalone PostgreSQL instance is an acceptable fallback only for SQL parsing, schema, transaction, pricing, variant, inventory, and concurrency tests that do not require Supabase Auth/Storage behavior.

The next phase requires explicit approval before installing tooling, creating a local stack, applying migrations, creating synthetic identities, or executing any SQL. It must use a dedicated local-only environment and must never reuse `.env.local`, the development project, existing containers, existing database services, or shared volumes.

## 2. Available tools

| Tool | Discovery result | Consequence |
|---|---|---|
| Node.js | `v24.19.0` | Available for future fixture/test orchestration |
| npm | `11.17.0` | Available for package scripts |
| TypeScript/typecheck | Existing project script | Can validate application types without a database |
| PostgreSQL CLI | `psql` not found | No SQL execution or local SQL validation available now |
| PostgreSQL server tools | `pg_ctl`, `initdb`, `postgres` not found | No standalone server available now |
| Docker | `docker` and `docker-compose` not found | No container runtime available now |
| Supabase CLI | `supabase` not found | No local Supabase orchestration available now |
| Windows services | No service matching `postgres`, `docker`, or `supabase` | No service was started or stopped |
| Common listeners | No listener on 5432, 5433, 8000, 8001, 8080, 8443, or 3000 | No local database/Supabase endpoint was contacted |

PowerShell execution policies were all `Undefined`; no policy modification was needed.

## 3. Recommended local validation strategy

Use a dedicated local Supabase CLI project in a disposable directory or isolated worktree after explicit approval. Pin the CLI and Supabase image versions used by the project. Use a dedicated local-only environment file containing only synthetic local keys. Do not copy or source `.env.local`.

The future stack should expose only loopback addresses, use dedicated ports, use fresh named volumes or a disposable project directory, and be removed with its own teardown command. Before startup, verify that no existing process owns the selected ports. After startup, verify the endpoint is local before applying any migration.

Apply the deployed baseline through migration 003, then run the migration 005 test suite. Migration 004 compatibility is a separate local-only scenario and must not be treated as deployment approval.

## 4. Alternative strategy

If local Supabase cannot be approved or reproduced, use a fresh standalone PostgreSQL instance with a dedicated data directory, dedicated role, dedicated database, and loopback-only port. Apply only the minimum schema and functions needed for migration 005. This strategy can validate SQL syntax, constraints, transactions, money rules, normalized options, inventory, archival, and locking, but cannot fully validate Supabase Auth claims, Storage policies, or production RLS semantics.

The standalone strategy must document extension/version differences and must not connect to an existing PostgreSQL service.

## 5. Isolation requirements

- Disposable local-only directory and database.
- Dedicated role and database; never use `postgres` credentials from another environment.
- Dedicated port not shared with existing services.
- No shared Docker volumes.
- No `.env.local` reuse or modification.
- No remote URL, service-role key, publishable key, Auth key, or Storage credential in the test environment.
- Synthetic UUIDs, users, products, orders, reservations, and inventory only.
- A preflight script must reject non-loopback URLs and reject production/development Supabase hostnames.
- Capture logs and test results outside the application data directory.
- Teardown must target only the named disposable project/volume/database.

## 6. Migration dependency matrix

| Dependency | Source | Required by migration 005 | Validation notes |
|---|---|---:|---|
| `public.store_products` | Auth/commerce baseline | Yes | `id`, product fields, `category_id`, `write_version` added by 005 |
| `public.store_product_variants` | Auth/commerce baseline | Yes | Product FK, SKU, price/currency, options JSON, active flag |
| `public.store_categories` | Auth/commerce baseline | Yes | Category existence validation |
| `public.store_collections` | Commerce foundation | Optional | Collection existence validation |
| `public.store_collection_products` | Commerce foundation | Optional | Collection synchronization |
| `public.store_variant_options` | Commerce foundation | Yes | Product-owned normalized options |
| `public.store_variant_option_values` | Commerce foundation | Yes | Option-owned values |
| `public.store_variant_values` | Commerce foundation | Yes | Variant/value associations |
| `public.store_inventory_locations` | Commerce foundation | Yes for physical variants | Location validation |
| `public.store_inventory_levels` | Commerce foundation | Yes for physical variants | `(location_id, variant_id)` key and reserved bounds |
| `public.store_order_items` | Commerce foundation | Yes for archival safety | Historical variant references use `ON DELETE SET NULL` |
| `public.store_orders` | Auth/commerce baseline | Yes for archival safety | Pending/confirmed/fulfilling order checks |
| `public.store_inventory_reservations` | Migration 004 | Optional compatibility dependency | Detected dynamically; active `reserved` rows block archival |
| `public.profiles` | Auth/commerce baseline | Indirect | `is_studio_member()` authorization dependency |
| `auth.users` / `auth.uid()` | Supabase Auth | Auth tests only | Required for true claims/RLS validation |
| `public.is_studio_member()` | Auth/commerce baseline | Yes | Function-owned authorization check |
| `pg_catalog.to_regclass` | PostgreSQL catalog | Yes | Optional reservation-table detection |
| `jsonb`, UUID, numeric, bigint | PostgreSQL built-ins | Yes | Payload and money validation |
| RLS policies | Baseline/foundation | Yes for role tests | Definer function and direct-table access must be tested separately |
| Function grants | Baseline/005 | Yes | PUBLIC/anon denied; authenticated execution granted |
| Indexes/unique constraints | Baseline/foundation | Yes | Duplicate slug/SKU and deterministic lock tests |
| Triggers | Auth baseline | Indirect | `auth.users` profile trigger must not be required by product writes |

No non-core extension was identified as a direct migration 005 dependency from the inspected SQL. The future local stack must still compare installed extensions with the development Supabase schema before declaring compatibility.

## 7. Future setup commands

Every command in this section **REQUIRES SEPARATE APPROVAL** and is planning-only.

Recommended Supabase path:

```powershell
# REQUIRES SEPARATE APPROVAL: install/pin Supabase CLI by an approved method
supabase --version

# REQUIRES SEPARATE APPROVAL: create/use a dedicated disposable local project directory
supabase init

# REQUIRES SEPARATE APPROVAL: start only the dedicated local Supabase stack
supabase start

# REQUIRES SEPARATE APPROVAL: inspect local status; verify loopback URLs and ports
supabase status
```

Before any migration command, a guard script must verify:

1. The URL is loopback/local.
2. The project identifier is not the development project.
3. The environment file contains no remote credentials.
4. The target database name, role, port, and volume are disposable.
5. Migration 004 remains excluded from Scenario A.

Scenario A then applies baseline migrations through 003 and migration 005 in a fresh local database. Scenario B repeats the process with migration 004 present only after separate compatibility approval.

## 8. Future teardown commands

All commands below **REQUIRE SEPARATE APPROVAL** and must be scoped to the named disposable environment:

```powershell
# REQUIRES SEPARATE APPROVAL: stop only the dedicated local Supabase stack
supabase stop

# REQUIRES SEPARATE APPROVAL: remove only the dedicated disposable project directory/volumes
# Use the approved, explicitly resolved path; never target the repository root.
```

Do not use `docker system prune`, broad volume cleanup, `supabase db reset` against an ambiguous project, or any command that can address an existing development database.

## 9. Authentication simulation plan

Create synthetic identities only in the isolated local Auth instance:

- Studio administrator: profile with the supported administrator role.
- Studio operator: profile with the supported Studio-member role, if the application supports it.
- Authenticated customer: ordinary authenticated profile with no Studio membership.
- Anonymous: no JWT.

The harness should obtain local Auth JWTs through the local Auth API or use a controlled test JWT fixture accepted only by the local instance. It must assert `auth.uid()` and profile lookup behavior. It must never mint or use a token for the development project.

Test the RPC through each role and test direct table access separately:

- Anonymous: cannot execute the RPC or access protected writes.
- Authenticated customer: cannot execute the RPC and cannot cross product boundaries.
- Studio operator/admin: can execute authorized product writes only.
- `service_role`: test only in the isolated local stack, with explicit expectations; it must not be used to mask RLS defects.

Inspect function owner, `SECURITY DEFINER`, empty `search_path`, PUBLIC/anon/authenticated grants, RLS policies, and cross-product authorization.

## 10. Atomic creation tests

For each test, record the pre-counts and post-counts for product, variants, options, option values, variant values, inventory, and collection links.

Cases:

- Valid product only.
- Product with physical variants, normalized options, and inventory.
- Product with digital variants and no inventory.
- Duplicate slug.
- Duplicate SKU.
- Invalid category.
- Invalid collection.
- Invalid option declaration.
- Invalid inventory location.
- Invalid currency, price, or compare-at value.
- Invalid later variant after valid product fields.
- Invalid later option after valid variants.
- Invalid later inventory after valid options.

Expected result: success commits all intended rows; every failure commits none of the rows from that call and leaves pre-existing rows unchanged.

## 11. Atomic editing and variant preservation tests

- Edit an existing product with the current `write_version`.
- Verify product revision increments once.
- Verify existing variant UUIDs remain unchanged.
- Add a new variant and verify the returned UUID and normalized associations.
- Omit a variant and verify archival rather than deletion.
- Synchronize collections.
- Update normalized options and verify legacy JSONB remains consistent.
- Submit a stale version and verify rejection without partial changes.
- Force a unique constraint failure and verify rollback.
- Verify historical order item references survive variant archival and deletion is never used.
- Verify existing inventory rows and reserved quantities are preserved by product editing.

## 12. Normalized options tests

Cover:

- Size only.
- Color only.
- Size plus color.
- Multiple values per option.
- Duplicate variant combination.
- Invalid option ownership.
- Cross-product option association.
- Duplicate normalized declaration.
- Legacy JSONB mirror consistency.
- Existing normalized record preservation.

Assert actual rows in `store_variant_options`, `store_variant_option_values`, and `store_variant_values`, including product/option/variant ownership and delete behavior.

## 13. Inventory tests

- New physical variant initializes inventory.
- Digital variant rejects inventory.
- Duplicate location entries are rejected.
- Unknown location is rejected.
- Existing `on_hand` and `reserved` values are preserved.
- Negative `on_hand`, nonzero initial `reserved`, invalid reorder point, and reserved-greater-than-on-hand are rejected.
- Multiple locations are supported.
- Inventory primary key and check constraints are enforced.
- Existing inventory is not rewritten by an edit payload.

Use synthetic locations and variants only. Never mutate the development inventory.

## 14. Rollback and fault-injection tests

| Fault | Setup | Expected result |
|---|---|---|
| Invalid later variant | Valid product and first variant in one RPC | Stable validation error; no product/variant rows remain |
| Invalid option | Valid variants followed by invalid option | No normalized option rows remain |
| Invalid inventory | Valid product/options followed by invalid location | No inventory or earlier rows from the call remain |
| Duplicate SKU | Existing conflicting SKU | Unique/conflict error; no partial product update |
| Stale version | Read old version, update product, submit old version | `STALE_VERSION`; no overwrite |
| Authorization | Customer/anonymous calls RPC | Authorization error; no rows changed |
| Archival safety | Reserved or active fulfillment reference | `INVENTORY_RESERVED` or stable archival error; variant remains active |

Each case requires before/after assertions in the same disposable database and cleanup by dropping the disposable database or resetting only the dedicated test schema.

## 15. Concurrency tests

Use two independent local PostgreSQL sessions with bounded lock and statement timeouts.

- Concurrent edits to one product: exactly one current-version writer succeeds; the other receives stale-version/conflict.
- Concurrent edits to different products: both succeed.
- Concurrent variant edits: existing row locks serialize deterministically.
- Duplicate SKU race: one succeeds and one receives a unique/conflict error.
- Concurrent archival: no lost update; reserved/fulfilling checks are respected.
- Reservation during archival: reservation lock/check prevents unsafe archival.
- Lock ordering: product, variants by UUID, inventory by `(location_id, variant_id)`.
- Deadlock detection: no deadlock under the documented acquisition order; timeout cleanup is verified.
- Retry behavior: only stale/conflict errors are eligible for caller retry; validation/authorization errors are not retried.

The harness must close both sessions in `finally` blocks and record SQLSTATE, elapsed time, and final row state.

## 16. Reservation-safe archival tests

Run with migration 004 absent and present:

- No reservations: archival allowed when no active order reference exists.
- Active reserved inventory: archival blocked.
- Pending order: archival blocked.
- Confirmed order: archival blocked.
- Fulfilling order: archival blocked.
- Completed/shipped order: historical reference survives; archival policy is verified explicitly.
- Multiple inventory locations: any active reserved location blocks archival.
- Multiple customized lines for one variant: historical references survive.

Do not call checkout RPCs or create remote orders. Do not assume migration 004 reservation semantics are correct; inspect and test them locally.

## 17. INR/USD tests

INR:

- Integer paise accepted.
- Fractional paise rejected.
- Negative values rejected.
- Overflow rejected.
- Compare-at price must be consistent.
- Major-unit and paise values must agree.

USD:

- Legacy major units accepted.
- Explicit `currency_code` is required/validated according to the RPC contract.
- No conversion is performed.
- Paise fields are rejected or ignored according to the contract; contradictory fields must fail.

Both currencies:

- Invalid currency rejected.
- NULL handling is explicit.
- Variant overrides are validated independently.
- Product/variant currency mismatch is rejected.

No existing prices are to be altered.

## 18. Grants/RLS tests

Inspect and assert:

- RPC owner and `SECURITY DEFINER` status.
- Empty `search_path`.
- No PUBLIC or anon execute grant.
- Authenticated execute grant exists.
- Table RLS remains enabled.
- Direct table writes are denied to non-Studio users.
- Studio membership is evaluated inside the function, not trusted from the client.
- Cross-product option, variant, collection, and inventory references are rejected.
- Service-role behavior is documented separately from end-user behavior.

## 19. CMS compatibility plan

Current application paths are documented in [route.ts](../app/api/studio/store/route.ts) and [studio-store.tsx](../components/studio/studio-store.tsx). The current route directly inserts/updates products and invokes the legacy `studio_replace_product_variants` RPC for edits. The v2 contract is documented in [studio-product-atomic-rpc-v2.md](./studio-product-atomic-rpc-v2.md).

Required future adapter work, outside this phase:

1. Route create and edit requests through `studio_save_product_atomic_v2`.
2. Pass and persist `write_version` from reads through saves.
3. Map stable SQL errors to existing API response shapes.
4. Stop using the destructive replacement RPC after compatibility verification.
5. Preserve existing editor response expectations for product ID, version, variant IDs, and active state.
6. Roll out behind a controlled feature flag only after local tests and separate deployment approval.

Rollback strategy: disable the adapter flag and restore the prior route behavior only if the deployment owner has separately approved that rollback; do not make migration 004/005 edits as an emergency runtime workaround.

## 20. Build environment observations

The project uses Next.js 16.3.0. Compilation succeeds, direct `npm run typecheck` passes, and the previous production build diagnostic fails at the separate TypeScript subprocess with `spawn EPERM`. This is an environment/process-spawn issue and does not validate or invalidate SQL. Do not disable antivirus, kill unrelated processes, set `ignoreBuildErrors`, or change Windows security settings as part of SQL validation.

## 21. Harness and result artifacts

Future artifacts should include:

- Local-only environment manifest with redacted values.
- Tool and image/version manifest.
- Applied migration list for Scenario A or B.
- Dependency introspection output.
- Synthetic fixture identifiers.
- Per-test SQLSTATE/error and before/after assertions.
- Concurrency timing and lock results.
- Grant/RLS inspection output.
- Test summary and teardown confirmation.

The harness should run through project scripts or an explicitly named future test runner, and should fail closed if the target URL is not loopback.

## 22. Approval gates

Separate approval is required for each of the following:

- Installing or updating PostgreSQL, Docker, Supabase CLI, or dependencies.
- Starting Docker Desktop, PostgreSQL, or a local Supabase stack.
- Creating a local database, role, schema, container, or volume.
- Applying migrations or executing SQL, including local SQL.
- Creating synthetic Auth identities or local Storage objects.
- Running seeds or fault-injection fixtures.
- Opening concurrent database sessions.
- Modifying application runtime wiring.
- Any remote Supabase call beyond read-only inspection.
- Any migration deployment or feature-gate activation.

## 23. Known limitations

- Tool discovery cannot prove Supabase image availability because Docker is not installed.
- Generic PostgreSQL cannot fully reproduce Supabase Auth, Storage, or hosted extension behavior.
- The existing development project was not used for local validation.
- Migration 004 compatibility remains an isolated future scenario, not deployment approval.
- Build `spawn EPERM` remains an environment diagnostic.
- No SQL syntax, transaction, RLS, grant, or concurrency claim is live-validated by this planning phase.

## 24. Final recommendation

**PLAN READY — WAITING FOR LOCAL ENVIRONMENT APPROVAL**

Do not begin environment installation, service startup, database creation, migration application, SQL execution, or test fixture creation until the next phase is separately authorized.
