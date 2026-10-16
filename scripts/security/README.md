# Storage runtime security harness

This harness is preparation-only for Phase 2.6A. It is disabled unless `--execute` is passed with both `ZEROCRAFT_RUN_STORAGE_RUNTIME_TESTS=1` and `ZEROCRAFT_STORAGE_TEST_APPROVED=1`. Production targets and service-role credentials are rejected.

## Test identities

Provision three accounts outside this harness, then obtain explicit approval before use:

1. `studio`: an existing authenticated account whose `public.is_studio_member()` returns true.
2. `customer-a`: an existing authenticated account without Studio membership.
3. `customer-b`: a separate existing authenticated account without Studio membership.

The harness signs in with normal email/password sessions. It never creates accounts, assigns roles, or uses the service-role key. Existing suitable accounts must not be used without explicit authorization.

Required variables are named `ZEROCRAFT_TEST_STUDIO_EMAIL`, `ZEROCRAFT_TEST_STUDIO_PASSWORD`, `ZEROCRAFT_TEST_CUSTOMER_A_EMAIL`, `ZEROCRAFT_TEST_CUSTOMER_A_PASSWORD`, `ZEROCRAFT_TEST_CUSTOMER_B_EMAIL`, and `ZEROCRAFT_TEST_CUSTOMER_B_PASSWORD`. Set `ZEROCRAFT_STORAGE_TEST_PRODUCT_ID` to an explicitly approved existing product ID; the harness never creates or edits products.

## Test cases

The complete matrix is declared in [storage-test-cases.mjs](./storage-test-cases.mjs): 30 cases total, 25 executable assertions, 4 application-API cases pending, and 1 public-read behavior case documented rather than asserted. Seventeen cases issue remote mutation-capable requests; successful cases create or modify only temporary Storage objects. Thirteen assertions require an object created earlier in the same run, and product-media cases require the explicitly approved existing product ID.

The signed-URL API authorization case is pending because the application currently exposes upload-and-preview in `app/api/store/customizations/route.ts`; it does not expose a separate signed-URL request endpoint.

## Commands

Preparation mode, no remote operation:

```powershell
node scripts/security/storage-runtime-tests.mjs
```

Future execution requires explicit approval and development targeting:

```powershell
$env:ZEROCRAFT_STORAGE_TARGET="development"
$env:ZEROCRAFT_RUN_STORAGE_RUNTIME_TESTS="1"
$env:ZEROCRAFT_STORAGE_TEST_APPROVED="1"
node scripts/security/storage-runtime-tests.mjs --execute
```

No credentials are printed. No cleanup is automatic. Cleanup must be a separately approved operation using the run manifest under `.storage-runtime-test/`, limited to object paths recorded by that run.

## Manifest and cleanup design

Each run receives a unique ID. Product objects use `products/{approved-product-id}/{uuid}.png`; customer objects use `{user-id}/{uuid}.png`, matching the deployed exact path policies. The local manifest records only project reference, user IDs, object paths, and results; never passwords, tokens, or service-role keys.

Local PNG, JPEG, WebP, SVG, and oversized payload fixtures are generated without uploading during preparation. Expected remote effects after explicit runtime approval are temporary Storage objects only. No product, category, variant, order, or customer database rows are created. Cleanup must delete only manifest-listed objects and only accounts explicitly created for testing; this phase does not execute cleanup.
