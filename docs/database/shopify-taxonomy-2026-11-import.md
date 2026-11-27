# Shopify Product Taxonomy 2026-11 import

This importer loads the official English Shopify Product Taxonomy release into the normalized
`shopify_taxonomy_*` tables. It does not write to `public.categories`, change product rows,
or delete the legacy category table.

## Requirements

- Node.js 20 or newer
- `curl`, `gzip`, and `sha256sum`
- A Supabase service-role key with permission to write to the taxonomy tables

Set the credentials in the shell running the importer:

```bash
export SUPABASE_URL="https://<project-ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-secret>"
```

Do not put the service-role key in source control or a browser environment variable.

## Run

From the repository root:

```bash
bash tooling/scripts/download-and-import-shopify-taxonomy-2026-11.sh
```

The script downloads the official `v2026-11` category, attribute, and return-reason release
assets, verifies their published SHA-256 checksums, decompresses them locally, validates
release versions and GID references, then upserts in bounded batches. Parent categories are
loaded before descendants. A failed import marks the release as failed; rerunning is safe
because writes use official GIDs and upsert keys.

## Imported data

- Vertical roots
- Category hierarchy, Shopify GIDs, names, full names, ancestor/child metadata
- Global attributes and all attribute values
- Category-to-attribute links and extended-attribute flags
- Return-reason definitions and category-to-return-reason links
- Release version and import counts

After import, verify that `shopify_taxonomy_releases.import_status = 'complete'`, all recorded
counts match table counts, and all three compressed source files exist in the private Storage
bucket. Product category setup during onboarding saves only the selected top-level Shopify
category GIDs, atomically with organization creation. The product picker then scopes the shared
taxonomy to those selected root groups.

## Official source

Shopify Product Taxonomy release: https://github.com/Shopify/product-taxonomy/releases/tag/v2026-11
