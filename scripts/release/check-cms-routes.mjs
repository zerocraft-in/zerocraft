import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const cms = join(root, "apps", "cms");

const pageRoutes = [
  ["/", "app/page.tsx"],
  ["/login", "app/login/page.tsx"],
  ["/works", "app/works/page.tsx"],
  ["/blogs", "app/blogs/page.tsx"],
  ["/clients", "app/clients/page.tsx"],
  ["/crm", "app/crm/page.tsx"],
  ["/content", "app/content/page.tsx"],
  ["/leads", "app/leads/page.tsx"],
  ["/projects", "app/projects/page.tsx"],
  ["/appointments", "app/appointments/page.tsx"],
  ["/studio/email", "app/studio/email/page.tsx"],
  ["/team", "app/team/page.tsx"],
  ["/store", "app/store/page.tsx"],
  ["/store/products", "app/store/products/page.tsx"],
  ["/store/categories", "app/store/categories/page.tsx"],
  ["/store/bin", "app/store/bin/page.tsx"],
  ["/media-library", "app/media-library/page.tsx"],
  ["/store/inventory", "app/store/inventory/page.tsx"],
  ["/audit-logs", "app/audit-logs/page.tsx"],
  ["/automations", "app/automations/page.tsx"],
  ["/notifications", "app/notifications/page.tsx"],
  ["/system-health", "app/system-health/page.tsx"],
  ["/integrations", "app/integrations/page.tsx"],
  ["/growth", "app/growth/page.tsx"],
  ["/search-console", "app/search-console/page.tsx"],
];

const apiRoutes = [
  ["/api/health", "app/api/health/route.ts"],
  ["/api/studio/me", "app/api/studio/me/route.ts"],
  ["/api/studio/team", "app/api/studio/team/route.ts"],
  ["/api/studio/audit-logs", "app/api/studio/audit-logs/route.ts"],
  ["/api/studio/store", "app/api/studio/store/route.ts"],
  ["/api/studio/store/recycle-bin", "app/api/studio/store/recycle-bin/route.ts"],
  ["/api/studio/store/media", "app/api/studio/store/media/route.ts"],
  ["/api/studio/store/media-library", "app/api/studio/store/media-library/route.ts"],
  ["/api/studio/store/category-media", "app/api/studio/store/category-media/route.ts"],
  ["/api/studio/alerts/low-stock", "app/api/studio/alerts/low-stock/route.ts"],
  ["/api/studio/system-health", "app/api/studio/system-health/route.ts"],
  ["/api/studio/integrations", "app/api/studio/integrations/route.ts"],
  ["/api/studio/integrations/connect", "app/api/studio/integrations/connect/route.ts"],
  ["/api/studio/integrations/health", "app/api/studio/integrations/health/route.ts"],
  ["/api/studio/features", "app/api/studio/features/route.ts"],
  ["/api/studio/leads", "app/api/studio/leads/route.ts"],
  ["/api/studio/crm", "app/api/studio/crm/route.ts"],
  ["/api/studio/content/pages", "app/api/studio/content/pages/route.ts"],
  ["/api/studio/leads/activities", "app/api/studio/leads/activities/route.ts"],
  ["/api/studio/projects", "app/api/studio/projects/route.ts"],
  ["/api/studio/projects/milestones", "app/api/studio/projects/milestones/route.ts"],
  ["/api/studio/growth", "app/api/studio/growth/route.ts"],
  ["/api/studio/search-console", "app/api/studio/search-console/route.ts"],
  ["/api/studio/search-console/oauth", "app/api/studio/search-console/oauth/route.ts"],
  ["/api/studio/search-console/oauth/callback", "app/api/studio/search-console/oauth/callback/route.ts"],
];

for (const [route, relativePath] of [...pageRoutes, ...apiRoutes]) {
  assert(existsSync(join(cms, relativePath)), `${route}: missing ${relativePath}`);
  console.log(`PASS ${route}`);
}

const navigation = readFileSync(join(cms, "lib", "admin-navigation.ts"), "utf8");
for (const staleRoute of ["/studio", "/transactions", "/subscriptions", "/disputes", "/scheduling", "/time-tracking", "/channels"]) {
  assert(!navigation.includes(`href: "${staleRoute}"`), `navigation still exposes stale route ${staleRoute}`);
}

const placeholderRoutes = ["channels", "devices", "disputes", "scheduling", "subscriptions", "time-tracking", "whats-new"];
for (const route of placeholderRoutes) {
  const source = readFileSync(join(cms, "app", route, "page.tsx"), "utf8");
  assert(source.includes("ComingSoonPage"), `${route}: placeholder route must use the honest ComingSoonPage state`);
}

const transactionsSource = readFileSync(join(cms, "app", "transactions", "page.tsx"), "utf8");
assert(transactionsSource.includes("ManualPaymentsReview"), "transactions: manual payments review route is missing");

console.log("CMS route contract checks passed.");
