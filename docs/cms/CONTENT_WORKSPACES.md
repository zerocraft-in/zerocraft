# CMS Content workspaces

The CMS now owns `/store/content/metaobjects`, `/store/content/files`, `/store/content/menus`, and `/store/content/articles`. `/store/content` opens Metaobjects. These use the existing CMS shell and shared `@zerocraft/components/ui` controls, tables, dialogs, inputs, and badges.

- Metaobjects: definitions, typed fields (text, number, boolean), required values, entries, draft/active status, search, and live summary counts. Manage toggles definition editing. Field schemas cannot change while entries exist.
- Files: compact table, date sorting, search, folder/reference filters, image upload dialog, persistent folders, logical folder assignment, file renaming, alt text, product references, and recoverable deletion through the existing media API. Uploads retain the existing JPEG/PNG/WebP and size restrictions.
- Menus: menu CRUD, editable links, ordering, three-level nesting, and a URL redirect records manager.
- Blog posts: blog group CRUD, post CRUD, author, excerpt, tags, SEO fields, and draft/published state.

Content persists in `cms_content_records`. The migration `20261101114953_cms_content_workspaces.sql` was applied to the configured Supabase project on November 1, 2026. Read/write endpoints enforce existing Content permissions; folder endpoints enforce Catalog permissions. Mutations check same-origin requests. RLS applies the same permission split, and parent groups cannot be deleted while containing records.

These are CMS records. Connecting menus, redirects, published articles, and metaobjects to a public storefront renderer is separate work; the CMS does not automatically change storefront navigation or install HTTP redirects. Article content uses a text editor, not a rich text editor.

Validation performed:
- CMS typecheck and CMS/Studio route contract checks pass.
- RBAC static security checks pass.
- `node --experimental-strip-types scripts/verify-content-workspaces.mjs` passes validation cases.
- Authenticated browser creation/read of a definition and typed entry succeeded, with database confirmation. Temporary records were removed.
- Database transaction verified article updates, deletes, duplicate-handle rejection, and parent deletion restrictions; transaction rolled back.
- Browser confirmed Files loads storage data and Menus loads without an API error.
- Targeted ESLint has zero errors and three existing `no-img-element` warnings for media previews.
