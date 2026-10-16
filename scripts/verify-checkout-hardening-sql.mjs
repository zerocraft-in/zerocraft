#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile("supabase/migrations/202610160004_checkout_runtime_hardening.sql", "utf8");
const appliedMigration = await readFile("supabase/migrations/202610160003_transactional_checkout.sql", "utf8");
const serverClient = await readFile("utils/supabase/server.ts", "utf8");
const browserClient = await readFile("utils/supabase/client.ts", "utf8");
const middleware = await readFile("utils/supabase/middleware.ts", "utf8");

const requiredPatterns = [
  /LOCAL DRAFT[\s—-]+NOT DEPLOYED/,
  /is_valid_customer_customization_registration/,
  /p_customer_id = auth\.uid\(\)/,
  /p\.status = 'active'/,
  /t\.status = 'published'/,
  /status = 'ready'/,
  /store_inventory_reservations/,
  /release_order_reservations/,
  /fulfill_order_reservations/,
  /search_path = ''/g,
  /grant execute on function public\.release_order_reservations[^;]+service_role/i,
  /grant execute on function public\.fulfill_order_reservations[^;]+service_role/i,
];
for (const pattern of requiredPatterns) assert.match(migration, pattern);

assert.doesNotMatch(migration, /\b(drop table|truncate|delete from)\b/i);
assert.match(migration, /drop policy if exists "Customers update own customization objects"/i);
assert.match(migration, /not exists \(\s*select 1 from public\.store_customizations/i);
assert.match(migration, /on delete restrict/i);
assert.match(appliedMigration, /create_transactional_checkout/);
assert.doesNotMatch(serverClient, /sb_publishable_|jamyqssytdzbiiahtmsq\.supabase\.co/);
assert.doesNotMatch(browserClient, /sb_publishable_|jamyqssytdzbiiahtmsq\.supabase\.co/);
assert.doesNotMatch(middleware, /sb_publishable_|jamyqssytdzbiiahtmsq\.supabase\.co/);

console.log("Checkout hardening SQL/config assertions passed: 20");
console.log("LOCAL STATIC VERIFIED only; migration remains unapplied.");
