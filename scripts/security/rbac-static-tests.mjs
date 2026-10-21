import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const expect = (condition, message) => assert.ok(condition, message);

const schema = read("packages/supabase/supabase/migrations/202610200014_granular_studio_permissions.sql");
const policySchema = read("packages/supabase/supabase/migrations/202610200015_rbac_read_write_policies.sql");
const auth = read("apps/cms/lib/studio-auth.ts");
const navigation = read("apps/cms/lib/admin-navigation.ts");
const shell = read("apps/cms/app/studio-shell.tsx");
const team = read("apps/cms/app/team/page.tsx");

for (const table of ["studio_permissions", "studio_role_permissions", "studio_user_permissions"]) {
  expect(schema.includes(`create table if not exists public.${table}`), `Missing RBAC table: ${table}`);
}
for (const permission of ["dashboard.read", "content.manage", "inventory.manage", "team.manage", "settings.manage", "billing.manage"]) {
  expect(schema.includes(`'${permission}'`), `Missing permission seed: ${permission}`);
}
expect(schema.includes("studio_has_permission"), "Missing permission security function");
expect(schema.includes("studio_permissions_for_current_user"), "Missing current-user permission function");
expect(schema.includes("create policy \"Admins manage user permission overrides\""), "Missing admin override policy");
expect(policySchema.includes("Permission read clients"), "Clients read policy is missing");
expect(policySchema.includes("Permission write clients"), "Clients write policy is missing");
expect(policySchema.includes("Permission read appointments"), "Appointments read policy is missing");
expect(policySchema.includes("Permission update own notifications"), "Notification self-read policy is missing");
expect(policySchema.includes("Permission manage inventory transfers"), "Inventory transfer policy is missing");

expect(auth.includes("requireStudioPermission"), "Server permission guard is missing");
expect(auth.includes("studio_has_permission"), "Server guard does not call the database permission function");
for (const [relative, permission] of [
  ["apps/cms/app/api/studio/team/route.ts", "team.manage"],
  ["apps/cms/app/api/studio/audit-logs/route.ts", "audit.read"],
  ["apps/cms/app/api/studio/automations/health/route.ts", "automations.read"],
  ["apps/cms/app/api/studio/alerts/low-stock/route.ts", "inventory.read"],
  ["apps/cms/app/api/studio/notifications/history/route.ts", "notifications.read"],
  ["apps/cms/app/api/studio/system-health/route.ts", "system_health.read"],
]) {
  const source = read(relative);
  expect(source.includes("requireStudioPermission"), `${relative} is not permission guarded`);
  expect(source.includes(`\"${permission}\"`), `${relative} is missing ${permission} guard`);
}

expect(navigation.includes("getAdminRoutePermission"), "Navigation route permission map is missing");
expect(navigation.includes("getAdminNavigationForRole(role: string, permissions?"), "Navigation does not accept effective permissions");
expect(shell.includes("/api/studio/me"), "Studio shell does not load effective permissions");
expect(shell.includes("router.replace(\"/\")"), "Studio shell does not guard direct unauthorized routes");
expect(team.includes("/api/studio/team/permissions"), "Team permission editor API is not connected");
expect(team.includes("Reset to role defaults"), "Team permission reset action is missing");
expect(read("apps/cms/app/system-health/page.tsx").includes("Run diagnostics"), "System Health diagnostics UI is missing");

console.log("RBAC static security tests passed: schema, RLS, API guards, navigation, and admin UI.");
