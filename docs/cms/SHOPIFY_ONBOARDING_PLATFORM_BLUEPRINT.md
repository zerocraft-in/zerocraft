# ZeroCraft store onboarding: live Shopify audit and platform blueprint

Date: November 1, 2026. Scope: research and proposed design only. No Shopify configuration, installations, cloud resources, or database contents were changed during this audit.

## 1. Evidence and its limits

Read-only inspection covered the existing Shopify merchant's Home, account/store switcher, Apps search, Settings > Apps, an installed first-party app's detail page, General settings, and Content > Files. The store is already established: a new merchant's initial signup and questionnaire were not reproduced. No store was created, app installed/uninstalled, provider connected, or launch action performed.

Observed patterns:

| Surface | Live observation | ZeroCraft interpretation |
|---|---|---|
| Store context | URLs stay under `/store/{shop-handle}`; account menu lists recent stores and Create store | A persistent tenant context in the URL; central identity and membership |
| Home | Metrics coexist with dismissible launch, payment, domain, shipping and learning cards | Separate operational metrics, setup readiness and optional recommendations |
| General | Business identity, contact/address, currency/region, units, time zone, order numbering and processing | Short initial form; advanced settings remain editable later |
| Apps | Installed/uninstalled tabs and an app marketplace entry | A durable installation lifecycle, not a cosmetic navigation toggle |
| App detail | Publisher, installed date, active extensions/functions, privacy/permissions and history | Installation manifest, explicit capabilities, history and connection status |
| Files | New folder/upload, filtering, sorting, alt text, references, replacement and link copying | Storage provider abstraction, metadata and reference-aware operations |

Shopify's public setup guide describes optional onboarding questions and then an accessible admin. Its launch guidance recommends checkout testing. These support a staged ZeroCraft experience, rather than one large form that blocks every feature. [Shopify setup](https://help.shopify.com/en/manual/intro-to-shopify/initial-setup), [launch preparation](https://help.shopify.com/en/manual/intro-to-shopify/initial-setup/setup-prepare-for-launch/).

Shopify treats Files as a Content surface. Making Media Manager an installable first-party app is a ZeroCraft product decision, not an exact copy of Shopify's implementation. App administration and permission/history concepts are supported by [Shopify app management](https://help.shopify.com/en/manual/apps/managing-apps).

## 2. Proposed merchant journey

```text
ZeroCraft account sign-in
  -> choose an authorized store or Create store
  -> /store/{store_id}/setup
  -> business basics
  -> connect merchant-owned Supabase
  -> select/create project and inspect it
  -> review and install Core Commerce v1
  -> add the chosen demo catalog (default starter selection; allow empty catalog)
  -> install first-party Media Manager
  -> Cloudflare OAuth, choose account, configure R2
  -> verify actual file operations
  -> configure selected commerce features
  -> review launch readiness and test checkout
  -> /store/{store_id} dashboard
```

Two milestones must be separate:

- `workspace_ready`: infrastructure and selected feature configuration work; owner can operate the admin.
- `live`: owner explicitly publishes after launch checks. Finishing a wizard does not silently activate payments, expose draft products, or publish a storefront.

## 3. Central platform and isolated stores

The requested login-before-database flow requires a central platform database in addition to each store's isolated Supabase project.

```text
Browser -> ZeroCraft platform session
        -> central stores + store_members authorization
        -> server resolves store_id to a private connection
        -> selected store's Supabase database
        -> selected store's installed storage adapter/R2 bucket(s)
```

Central data should contain platform accounts, ownership/membership, project bindings, encrypted provider grants, setup progress, installation records, provisioning jobs and audit history. Products, orders, customers, inventory, settings and file metadata remain in the store's own database. Do not centralize customer/order records simply to power the switcher.

Suggested platform tables:

| Table | Purpose |
|---|---|
| `stores` | Immutable ID, display name, slug, owner, lifecycle and completion timestamps |
| `store_members` | Platform user, store, role and membership status |
| `store_connections` | Selected project/account IDs, version, state and encrypted secret references |
| `oauth_grants` | Provider grants, expiry, encrypted refresh token and revocation state |
| `onboarding_steps` | Per-store step, verification evidence, attempts and completion |
| `provisioning_jobs` | Resumable setup jobs, locks, idempotency and failure details |
| `apps` | Trusted first-party catalog and app manifests |
| `app_installations` | Store, app/version, approved scopes and lifecycle |
| `store_features` | Requested modules and verified effective capabilities |
| `platform_audit_logs` | Actor, store, operation, resource and result; no tokens |

Use a unique project binding so two ZeroCraft stores cannot accidentally claim the same Supabase project. A caller cannot choose a database endpoint or service credential. Validate platform membership on every store page, API request and background job.

Platform merchant authentication and each tenant's customer authentication are different systems. A platform access token is not automatically a valid token in every tenant's Supabase Auth. For this design, merchant administration should go through a server-side API authorized by central membership and mapped tenant permissions. Tenant customer accounts remain local to that tenant. Central staff IDs must not be inserted into foreign keys referencing an unrelated tenant's `auth.users`; introduce an explicit platform-user/staff mapping and migrate audit attribution.

## 4. Routes and switching

```text
/login
/stores
/stores/new
/store/{store_id}
/store/{store_id}/setup
/store/{store_id}/products
/store/{store_id}/orders
/store/{store_id}/customers
/store/{store_id}/content/files
/store/{store_id}/apps
/store/{store_id}/apps/media-manager
/store/{store_id}/settings
/api/stores/{store_id}/...
/api/oauth/supabase/callback
/api/oauth/cloudflare/callback
```

The switcher navigates between store-scoped paths without signing the merchant out of ZeroCraft. URLs, API requests, query/cache keys, upload URLs and job payloads all carry the immutable store ID. A last-selected-store preference is only a navigation hint, never authorization. Preserve the current store in each open browser tab; never use a global active-store cookie to decide the database for a mutation.

Reserve `/store/new` and existing static route names during transition. Redirect old links only when an authorized store can be unambiguously resolved. Changing a display name/slug must not change resource ownership.

## 5. Wizard screens and verification

| Step | Merchant inputs | Completion evidence |
|---|---|---|
| Business basics | Store name, industry/template, business country, contact email, currency, time zone, physical/digital products | Valid fields and persisted central store record |
| Business details | Business/legal name, address, support contact, fulfillment origin and unit/weight defaults where relevant | Applicable fields validated and synchronized to store settings |
| Supabase connection | Consent, organization, project and region if creating a project | Healthy selected project, required access, unique binding |
| Database install | Reviewed schema package/version and starter-data choice | Migration ledger/version/checksum, expected tables/policies and a controlled read/write check |
| Media Manager | Install permissions, Cloudflare account, bucket choices and delivery settings | Installation plus successful write/read/delete verification and upload-origin checks |
| Feature setup | Chosen payments, shipping/tax settings, inventory location, menus/pages and storefront template | Checks for selected modules only; not checkbox self-reporting |
| Launch review | Review real catalog, checkout test, storefront preview and launch choice | Actual readiness results and explicit launch action |

Do not request every advanced business field on the first screen. Show progress, Save and exit, Back, Retry, Reconnect, and a plain explanation of provider failures. A dashboard shell may remain available during setup, but unavailable operations explain the missing dependency.

## 6. Supabase OAuth and schema provisioning

Supabase supports OAuth integrations for managing user-owned organizations/projects. A migration can be applied through `POST /v1/projects/{ref}/database/migrations` with the appropriate database-write grant. Database passwords cannot simply be retrieved by OAuth; using the documented migration API avoids making raw Postgres password collection the default setup path. [Integration guide](https://supabase.com/docs/guides/integrations/build-a-supabase-oauth-integration), [migration API](https://supabase.com/docs/reference/api/v1-apply-a-migration).

Scope requirements depend on the chosen flow: organization/project discovery, database inspection/write, and possibly project creation, runtime key retrieval and Auth settings configuration. Request only the permissions actually needed; upgrading scopes requires fresh provider consent. [OAuth scopes](https://supabase.com/docs/guides/integrations/build-a-supabase-oauth-integration/oauth-scopes).

Recommended server sequence:

1. Create a short-lived one-use OAuth attempt bound to platform user, session, store ID and return path; use state/PKCE as supported by the provider.
2. Exchange the authorization code on the server and recheck membership in the callback.
3. Let the merchant select the target organization/project. Selecting one project in our UI does not itself narrow every permission of the provider grant.
4. Inspect project health and application-owned objects. Provider-owned Auth/Storage objects do not make a new project non-empty for application purposes.
5. For an empty app database, show the exact project, package/version, seed selection and intended writes before initialization. For an existing database, use a compatibility/migration review instead of resetting it.
6. Acquire a per-store/project provisioning lock and apply the versioned core package through the Management API.
7. Record migration status/checksum both centrally and in the tenant's schema-version ledger; verify tables, RLS/grants, settings and runtime connectivity.
8. Seed the chosen starter package separately and record its version/batch.
9. Mark Database ready only after verification. Refresh/retry resumes the job; it must not reinitialize the project.

Do not push arbitrary SQL provided by a browser or plugin. Existing user tables are never blanket-dropped. A failed installation must preserve successful earlier resources and offer a safe retry, not automatic deletion of the merchant's project.

## 7. Starter content without fake business activity

Recommended initial template: three to six draft demo products with variants, two categories/collections, basic navigation, homepage sections and draft policy/page templates. Industry presets can change these values.

Tag demo records with `is_demo`, `seed_batch_id` and template version. Keep demo products out of public listings, real inventory commitments, metrics and launch-product counts. Never create fake customer accounts, paid orders, transactions or reviews. Do not pretend generated policy text has been verified for the merchant.

The starter choice should be obvious: Add starter catalog or Start empty. Retries use stable seed identities and a seed ledger. They never overwrite a merchant-edited product just because its original demo handle matches. Remove demo content first shows the matching records and preserves edited/converted records unless the merchant explicitly selects them.

Avoid a circular dependency between demo seeding and Media Manager: use bundled, licensed demo placeholders before R2 setup, and optionally import them into the store bucket after the adapter is verified.

## 8. Media Manager and Cloudflare R2

Cloudflare documents third-party OAuth client registration, required scopes and public-client domain verification. Public visibility is needed for merchants outside the publisher's own Cloudflare account. Confirm the exact R2/account operations in an integration proof before advertising fully automatic provisioning. [Cloudflare client setup](https://developers.cloudflare.com/fundamentals/oauth/create-an-oauth-client/).

OAuth authorization is not the same thing as S3 runtime credentials. Select the Cloudflare account, verify R2 availability, and provision/select dedicated bucket resources. Use an explicitly supported runtime credential path: appropriately authorized bucket-scoped S3 credentials, supported temporary credentials backed by a parent credential, or a separately designed Worker/binding adapter. Do not treat a generic OAuth access token as an S3 secret. [R2 authentication](https://developers.cloudflare.com/r2/api/tokens/).

The first-party app install should show its publisher, version, required access, supplied capabilities and data-retention behavior. Its state is independent from the provider connection:

```text
not_installed -> installing -> installed
connection: not_connected -> authorizing -> configuring -> verifying -> ready
failure: failed / reconnect_required / degraded
```

For public product media versus private documents, use explicitly separated access policies/buckets. Product images can have public delivery; private documents need authorized downloads. Configure delivery with an appropriate custom domain or Worker path; Cloudflare's `r2.dev` endpoint is for development. [Public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/).

For browser uploads, server authorization should issue a short-lived operation-specific upload URL; then a finalize endpoint verifies the stored object before marking its metadata ready. Include size/type enforcement, randomized keys, origin restrictions, reference checks and cleanup of incomplete uploads. Browser upload flows require correct bucket CORS. [Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), [CORS](https://developers.cloudflare.com/r2/buckets/cors/).

Verification must test write, metadata/read, intended public/private delivery, and deletion of a temporary probe. Mark Files ready only when the app is installed, its schema is compatible, storage is healthy and the current member has access. Before readiness, `/content/files` should explain Connect storage rather than show a broken empty table. Installation is not equivalent to connection or activation.

Uninstall/disconnect must not silently delete objects or break existing product media. Preserve metadata and existing read paths where possible, stop unauthorized writes, revoke the relevant app connection, and offer an explicit migration/export/removal path. Connection revocation after onboarding should produce a scoped health banner, not restart the entire business wizard.

## 9. Core schema and plugin schema

The existing 71-table snapshot is not yet a minimal Core Commerce v1 package. Separate a fresh core baseline from optional Gmail/AI, procurement, advanced health and other modules. This is also separate from the earlier simple-table-name proposal, which has not been applied as a wholesale rename.

A minimal core must still preserve real checkout/payment correctness: products/options/variants, collections/categories as selected, customers/addresses, cart, orders/items, payment attempts/idempotency, stock/reservations, staff mapping/permissions, settings, navigation and audit attribution.

A minimal `files`/asset-reference structure may belong to core so products have stable references; the Media Manager app adds management UI, folders/upload sessions, provider configuration and runtime capabilities. Table existence must not imply that the feature is active.

Each trusted app manifest declares its supported core versions, dependencies, requested permissions, migrations, capabilities and uninstall behavior. Begin with curated first-party apps. A future third-party marketplace needs scoped APIs and isolation; it must not receive tenant service-role keys or permission to run arbitrary schema changes.

## 10. Completion, recovery and dashboard behavior

Use separate states for onboarding, provider connectivity and publication. Example onboarding steps: pending, in_progress, waiting_for_provider, verifying, completed, failed, skipped (optional only). External steps run as durable jobs with job ID, idempotency key, lock, attempts, connection version and verification evidence.

Hide the large setup guide when every currently required step is verified and the completion timestamp/version is persisted. Do not reset completion just because the user signs in, switches a store or a background credential expires. Keep Setup summary under Settings. If R2 later fails, show a media-specific action banner; if a new optional app is added, show that app's setup card.

Before launch, require real published catalog content, valid pricing/currency, a working checkout/payment mode, applicable shipping/tax configuration, contact/policy review and a preview/test order. A custom domain may be optional when a platform subdomain is available. Optional marketing apps must not block launch.

Failure cases include OAuth denial/replay, token refresh races, missing scopes, paused projects, selected non-empty projects, duplicate project claims, concurrent initialization, migration failure, browser closure, billing/account prerequisites, R2 CORS/data-plane failure, demo cleanup after merchant edits and connection revocation. Persist the last verified milestone and retry only the failed dependency.

## 11. Gap from the current repository

Current code uses an environment-based, host-selected connection registry and separate project-local merchant sign-ins. The switcher changes admin origins. There is no central platform membership system, store-scoped path resolver, Supabase/Cloudflare provider onboarding, durable provisioning runner, installable Media Manager lifecycle, or persisted launch checklist.

The new request intentionally changes that architecture. Replace the merchant admin's host-only/environment-only connection lookup with central membership plus a store-scoped server resolver. Keep host resolution for public storefront domains. Do not mutate global process environment variables or reuse an unscoped client/cache when switching stores. Existing project data must be adopted into a central store record, not recreated or seeded over.

## 12. Implementation order and acceptance

1. Central Auth, stores/members, store-scoped routing and server authorization. Verify that a member cannot access another store by editing any URL or API parameter.
2. Supabase OAuth plus an empty-project Core Commerce installer and resumable jobs. Verify denial/retry, existing-project protection, version checks and two genuinely separate projects.
3. Versioned demo templates, labels and safe cleanup. Verify retries and preservation of merchant edits.
4. First-party app catalog and Media Manager, Cloudflare public OAuth and a proven R2 runtime credential path. Verify public/private access, expiry/revocation and cross-store object isolation.
5. Conditional feature setup, launch review, test checkout and completed-dashboard behavior. Verify completion persists across sign-ins and optional modules do not force a full onboarding restart.
6. Adopt the current live store without resetting data; test two stores in separate browser tabs; then roll out code, provider registrations and platform configuration together.

The highest-value first implementation is central identity + store membership + the Supabase installer. The highest-risk provider proof is Cloudflare OAuth through to real, scoped R2 file operations. No second customer project or paid provider resource was created for this research.
