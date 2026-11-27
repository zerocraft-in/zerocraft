import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const expect = (condition, message) => assert.ok(condition, message);

const migration = read("packages/supabase/supabase/migrations/20261109100000_studio_operations_foundation.sql");
const projectsMigration = read("packages/supabase/supabase/migrations/20261109120000_studio_projects_v2.sql");
const cmsMigration = read("packages/supabase/supabase/migrations/20261109130000_cms_content_v2.sql");
const catalogSeedMigration = read("packages/supabase/supabase/migrations/20261109140000_cms_content_catalog_seed.sql");
const settingsMigration = read("packages/supabase/supabase/migrations/20261110160000_studio_settings_and_notifications.sql");
const foundationMigration = read("packages/supabase/supabase/migrations/20261110180000_studio_backend_foundation.sql");
const apiHelper = read("apps/studio/lib/studio-api.ts");

expect(migration.includes("public.permissions"), "Studio foundation must use canonical permissions table");
expect(migration.includes("public.role_permissions"), "Studio foundation must use canonical role_permissions table");
expect(!migration.includes("public.studio_permissions"), "Studio foundation must not use pre-rename RBAC table");
expect(!migration.includes("public.studio_role_permissions"), "Studio foundation must not use pre-rename role table");
expect(migration.includes("public.has_permission"), "Studio RLS must use the canonical permission function");
expect(migration.includes("public.accounts(id)"), "Studio operations must reference canonical accounts");
expect(migration.includes("to_regclass('public.clients')"), "Optional clients relation must be guarded");
expect(migration.includes("to_regclass('public.works')"), "Optional works relation must be guarded");
expect(!migration.includes("client_id uuid references public.clients"), "Studio leads must not hard-require clients");
expect(!migration.includes("work_id uuid references public.works"), "Studio projects must not hard-require works");
expect(projectsMigration.includes("add column if not exists owner_id"), "Projects migration is missing owner assignment");
expect(projectsMigration.includes("add column if not exists progress"), "Projects migration is missing progress tracking");
expect(projectsMigration.includes("projects.manage"), "Projects migration is missing project RLS");
for (const token of ["content_versions", "content_workflow_events", "content_blocks", "scheduled_at", "publish_due_pages", "studio-publish-due-pages"]) expect(cmsMigration.includes(token), `CMS v2 migration is missing ${token}`);
for (const token of ["content_type", "useful-content-systems", "testimonials", "on conflict (slug) do nothing"]) expect(catalogSeedMigration.includes(token), `CMS content catalog seed is missing ${token}`);

for (const permission of [
  "dashboard.read",
  "content.read",
  "content.manage",
  "leads.read",
  "leads.manage",
  "projects.read",
  "projects.manage",
  "media.read",
  "media.manage",
  "analytics.read",
  "audit.read",
  "audit.write",
  "settings.manage",
  "integrations.manage",
]) {
  expect(apiHelper.includes(`"${permission}"`), `Studio API permission type is missing ${permission}`);
  expect(migration.includes(`'${permission}'`), `Studio migration is missing ${permission}`);
}

for (const relative of [
  "apps/studio/app/api/studio/leads/route.ts",
  "apps/studio/app/api/studio/leads/[id]/route.ts",
  "apps/studio/app/api/studio/leads/[id]/activities/route.ts",
  "apps/studio/app/api/studio/leads/[id]/stage/route.ts",
  "apps/studio/app/api/studio/leads/[id]/convert-to-project/route.ts",
]) {
  const source = read(relative);
  expect(source.includes("requireStudioAccess"), `${relative} is missing Studio authorization`);
}

expect(read("apps/studio/app/api/studio/content/route.ts").includes('requireStudioAccess("content.manage")'), "Content API is missing shared permission guard");
expect(read("apps/studio/app/api/studio/media/route.ts").includes('requireStudioAccess("media.manage")'), "Media API is missing shared permission guard");
expect(read("apps/studio/app/api/studio/media/folders/route.ts").includes('requireStudioAccess("media.manage")'), "Media folder API is missing shared permission guard");
expect(read("apps/studio/app/api/studio/projects/route.ts").includes('requireStudioAccess("projects.read")'), "Projects list API is missing read guard");
expect(read("apps/studio/app/api/studio/projects/[id]/route.ts").includes('requireStudioAccess("projects.manage")'), "Project detail API is missing manage guard");
expect(read("apps/studio/app/api/studio/projects/[id]/milestones/[milestone]/route.ts").includes('requireStudioAccess("projects.manage")'), "Milestone API is missing manage guard");
expect(read("apps/studio/app/api/studio/content/[id]/versions/route.ts").includes('requireStudioAccess("content.read")'), "Content versions API is missing read guard");
expect(read("apps/studio/app/api/studio/content/[id]/workflow/route.ts").includes('requireStudioAccess("content.manage")'), "Content workflow API is missing manage guard");
expect(read("apps/studio/app/api/studio/content/[id]/blocks/route.ts").includes('requireStudioAccess("content.manage")'), "Content blocks API is missing manage guard");

expect(apiHelper.includes('from("audit_logs")'), "Studio audit helper is missing audit_logs writes");
expect(apiHelper.includes("actor_id: actorId"), "Studio audit helper must bind actor_id to the authenticated user");

for (const token of [
  "create table if not exists public.workspace_settings",
  "lead_assigned_enabled",
  "approval_needed_enabled",
  "weekly_digest_enabled",
  "create or replace function public.studio_integration_statuses()",
  "public.has_permission('settings.manage')",
]) {
  expect((settingsMigration + foundationMigration).includes(token), `Studio settings migration is missing ${token}`);
}

const settingsApi = read("apps/studio/app/api/studio/settings/route.ts");
expect(settingsApi.includes('from("notification_preferences")'), "Settings must use the Studio per-user notification preferences");
for (const permission of ["leads.read", "projects.read", "analytics.read", "media.read"]) {
  expect(settingsApi.includes(`"${permission}"`), `Settings permissions sidebar must use ${permission}`);
}
expect(settingsApi.includes("studio_integration_statuses"), "Settings must read integration status from the registry");

const settingsUi = read("apps/studio/app/studio/settings/_components/settings-section.tsx");
expect(settingsUi.includes("patchSettings({ name, currency, timezone })"), "Workspace settings must persist through the API");
expect(settingsUi.includes("patchSettings({ brandName: name, accentColor, logoUrl, faviconUrl, fontFamily, themeMode })"), "Appearance settings must persist through the API");
expect(settingsUi.includes("Your role does not have permission to view integration status."), "Integration status must honor permissions");
expect(!settingsUi.includes("Not connected\"], [\"Resend"), "Integration states must not be hardcoded");

const projectsPage = read("apps/studio/app/studio/projects/page.tsx");
expect(projectsPage.includes('project.status === "active"'), "Projects KPI must count the active status");
expect(projectsPage.includes('get("project")'), "Projects page must honor the selected project query parameter");
expect(/finally\s*\{\s*setSaving\(false\);\s*\}/.test(projectsPage), "Project save must clear saving state after network failures");
expect(/finally\s*\{\s*setBusy\(false\);\s*\}/.test(projectsPage), "Milestone creation must clear busy state after network failures");

const leadsPage = read("apps/studio/app/studio/inquiries/page.tsx");
expect(leadsPage.includes("pageSize = 50"), "Lead pipeline must use bounded pagination");
expect(leadsPage.includes("payload.total"), "Lead pipeline must use the API's exact total");
expect(leadsPage.includes('aria-label="Lead pages"'), "Lead pipeline pagination must be accessible");

const contentPage = read("apps/studio/app/studio/content/page.tsx");
expect(contentPage.includes("Your unsaved edits will be discarded"), "Version restore must warn before discarding dirty content");

const mediaFolders = read("apps/studio/app/api/studio/media/folders/route.ts");
expect(mediaFolders.includes("renameStudioFolder"), "Folder rename must operate through Cloudflare R2");
expect(!mediaFolders.includes('from("files")'), "Folder rename must not depend on a media metadata table");

const mediaApi = read("apps/studio/lib/studio-r2-server.ts");
expect(mediaApi.indexOf('if (mime === "image/svg+xml")') < mediaApi.indexOf('if (mime.startsWith("image/"))'), "SVG type detection must run before generic image detection");

const header = read("apps/studio/app/studio/studio-header.tsx");
expect(header.includes('router.push("/studio/content?new=page")'), "Global New menu must create content");
expect(header.includes('router.push("/studio/inquiries/new")'), "Global New menu must create leads");
expect(header.includes('router.push("/studio/projects/new")'), "Global New menu must create projects");
console.log("Studio foundation static tests passed: RBAC, APIs, settings persistence, pagination, workflow fixes, and UI actions.");
