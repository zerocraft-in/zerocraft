# CMS audit report

## Current audit update — 2026-10-29

The earlier findings below are historical. The current tree includes a protected audit-log viewer, a live Apps & Integrations hub, the integration registry API, recycle-bin routes, and the related release checks. Current verification passes for migration preflight, RBAC static checks, Gmail security checks, CMS route contracts, CMS typecheck, and the production CMS build. The full lint command was started but did not produce output and was stopped after hanging; focused diagnostics for the changed files report no errors.

Audit date: 2026-10-20
Overall status: **In progress — not release-ready without follow-up**

## Findings summary

| ID | Severity | Area | Finding | Recommendation |
|---|---|---|---|---|
| CMS-001 | High | Runtime assets | Current working-tree deletions include assets still referenced by active CMS store components. | Restore, replace, or remove each reference before release; run an asset-reference check in CI. |
| CMS-002 | High | Validation | `npm.cmd run typecheck` fails on missing UI modules imported by existing landing-page sections. | Remove orphaned sections, restore the shared components, or exclude the unused tree deliberately and document why. |
| CMS-003 | Medium | Data consistency | Category item assignment performs separate remove/add updates. A failure between them can leave partial assignments. | Move assignment into a database RPC/transaction or implement compensating rollback. |
| CMS-004 | Medium | Data consistency | Product save and taxonomy save are separate operations. A taxonomy failure can leave a saved product with incomplete taxonomy. | Extend the atomic product RPC to include taxonomy or add a transaction boundary. |
| CMS-005 | Medium | Storage lifecycle | Category image replacement/removal does not delete the old object from storage. | Track storage paths and enqueue/delete superseded objects after a successful record update. |
| CMS-006 | Medium | Observability | `store_audit_logs` exists in the schema, but the CMS has no audit-log viewer or export. | Add a protected, paginated audit report with actor, action, entity, timestamp, and before/after metadata. |
| CMS-007 | Low | Performance | The store GET loads categories, all products, nested media, variants, inventory, and collection data in one request. | Split list/detail queries, paginate products, and select nested data only when required. |
| CMS-008 | Low | Test coverage | No focused CMS UI/API test suite was found in the repository scan. | Add route-handler tests, category CRUD tests, and a smoke test for protected navigation. |

## Security review

Positive controls observed:

- Proxy-level authentication protects private CMS pages and API requests.
- Studio API routes check authenticated user access and staff roles.
- Same-origin checks are applied to mutating store routes.
- Product input validates slugs, prices, stock, variants, status, and rights-review publication rules.
- Category media uses shared storage file validation and safe object-key generation.
- JSON responses from sensitive studio endpoints are marked private/no-store.

Follow-up controls:

- Confirm the service-role storage fallback is restricted to server execution and that the secret is never exposed to client bundles.
- Confirm storage bucket policies match the intended public category-image behavior.
- Add rate/size monitoring around bulk item assignment and media uploads.

## Correctness review

The category manager correctly keeps parent-category selection, item selection, archive confirmation, and discard confirmation in client state. The server validates the parent/subcategory relationship before assignment. However, the update operations are not grouped transactionally, which is the main correctness risk in the new workflow.

The product route uses an atomic RPC for product and variant writes and optimistic write-version handling. Its subsequent taxonomy update weakens the overall atomicity and should be included in the same transaction boundary.

## Release gates

Do not mark the CMS release-ready until:

1. All active references to deleted public assets resolve or are intentionally removed.
2. CMS typecheck passes with the intended source tree.
3. Category assignment and product taxonomy updates have failure-safe transactional behavior.
4. Category media lifecycle behavior is defined and tested.
5. Protected CRUD smoke tests run against a deployed migration set.

## Validation record

- Source inventory and route inventory completed.
- Git working-tree status and diff inventory completed.
- Targeted ESLint: passed on changed CMS TypeScript/TSX files.
- Production build: compilation passed; environment failed afterward with `spawn EPERM`.
- Typecheck: failed on pre-existing missing UI imports in orphaned section files.
- Static reference scan: confirmed active references to deleted assets.
- Live browser verification: the updated shell rendered on `/store/categories` and `/reports` with the new rail, setup block, channels, utilities, and payment action visible.
