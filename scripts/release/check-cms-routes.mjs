import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const cms = join(root, "apps", "cms");

const pageRoutes = [
  ["/", "app/page.tsx"],
  ["/login", "app/login/page.tsx"],
  ["/studio/works", "app/studio/works/page.tsx"],
  ["/studio/blogs", "app/studio/blogs/page.tsx"],
  ["/studio/clients", "app/studio/clients/page.tsx"],
  ["/studio/crm", "app/studio/crm/page.tsx"],
  ["/studio/content", "app/studio/content/page.tsx"],
  ["/studio/leads", "app/studio/leads/page.tsx"],
  ["/studio/projects", "app/studio/projects/page.tsx"],
  ["/studio/appointments", "app/studio/appointments/page.tsx"],
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
  ["/api/store", "app/api/store/route.ts"],
  ["/api/store/recycle-bin", "app/api/store/recycle-bin/route.ts"],
  ["/api/store/media", "app/api/store/media/route.ts"],
  ["/api/store/media-library", "app/api/store/media-library/route.ts"],
  ["/api/store/category-media", "app/api/store/category-media/route.ts"],
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

const placeholderRoutes = ["channels", "scheduling", "time-tracking", "whats-new"];
for (const route of placeholderRoutes) {
  const source = readFileSync(join(cms, "app", route, "page.tsx"), "utf8");
  assert(source.includes("ComingSoonPage"), `${route}: placeholder route must use the honest ComingSoonPage state`);
}

const transactionsSource = readFileSync(join(cms, "app", "transactions", "page.tsx"), "utf8");
assert(transactionsSource.includes("ManualPaymentsReview"), "transactions: manual payments review route is missing");

console.log("CMS route contract checks passed.");
