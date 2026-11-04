# CMS content workspaces

The CMS content area provides structured publishing tools inside the authenticated store shell.

## Workspaces

- **Metaobjects** — reusable definitions with typed fields, required values and draft/active entries.
- **Files** — searchable media records, folders, references, alt text, upload validation and recoverable deletion through the media API.
- **Menus** — menu CRUD, ordered links and nested navigation records.
- **Articles** — article groups, authors, excerpts, tags, SEO fields and draft/published state.

## Data and permissions

Content records are stored in the CMS content tables and are scoped to the resolved store. Read/write endpoints enforce the relevant content or catalog permission, and mutations enforce the authenticated session, ownership and request origin rules. Parent definitions/groups cannot be removed while dependent records remain.

These workspaces manage content records; they do not automatically publish a public renderer, install HTTP redirects or replace storefront navigation until the corresponding public integration is implemented.

## Verification

Run the content workspace validation together with the standard release gate:

```bash
node --experimental-strip-types scripts/verify-content-workspaces.mjs
npm run verify:release
```
