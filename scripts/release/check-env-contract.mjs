import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readKeys(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  return new Set(
    source
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Z][A-Z0-9_]*)=/)?.[1])
      .filter(Boolean),
  );
}

const rootKeys = readKeys(path.join(root, ".env.example"));
const cmsKeys = readKeys(path.join(root, "apps/cms/.env.example"));
const storeKeys = readKeys(path.join(root, "apps/store/.env.example"));

const rootRequired = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_ADMIN_URL",
  "STUDIO_CREDENTIALS_ENCRYPTION_KEY",
  "CRON_SECRET",
  "GA4_PROPERTY_ID",
  "GOOGLE_SEARCH_CONSOLE_SITE_URL",
  "INSTAGRAM_ACCESS_TOKEN",
  "GOOGLE_BUSINESS_PROFILE_ACCOUNT_ID",
  "NEWSLETTER_WEBHOOK_URL",
  "ZEROCRAFT_MANUAL_PAYMENTS_ENABLED",
];

const cmsRequired = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_ADMIN_URL",
  "WEEKLY_REPORT_WORKER_SECRET",
  "CRON_SECRET",
  "STUDIO_CREDENTIALS_ENCRYPTION_KEY",
  "NEXT_PUBLIC_X_URL",
  "GA4_PROPERTY_ID",
  "GOOGLE_SEARCH_CONSOLE_SITE_URL",
  "INSTAGRAM_ACCESS_TOKEN",
  "GOOGLE_BUSINESS_PROFILE_ACCOUNT_ID",
];

const storeRequired = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_STORE_URL",
  "ZEROCRAFT_TRANSACTIONAL_CHECKOUT_ENABLED",
  "ZEROCRAFT_MANUAL_PAYMENTS_ENABLED",
  "NEWSLETTER_WEBHOOK_URL",
];

for (const [label, keys, required] of [
  ["root", rootKeys, rootRequired],
  ["cms", cmsKeys, cmsRequired],
  ["store", storeKeys, storeRequired],
]) {
  const missing = required.filter((key) => !keys.has(key));
  assert.deepEqual(missing, [], `${label} env example is missing: ${missing.join(", ")}`);
}

console.log("Environment contract checks passed: root, CMS and store templates are aligned.");
