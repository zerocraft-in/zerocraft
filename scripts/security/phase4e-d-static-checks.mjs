import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve("supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql"), "utf8");
const setup = readFileSync(resolve("docs/phase4e-d-staging-setup.md"), "utf8");
const plan = readFileSync(resolve("docs/phase4e-d-integration-test-plan.md"), "utf8");
const sql = readFileSync(resolve("supabase/staging/phase4e-d-database-integration-tests.sql"), "utf8");

assert.match(migration, /PENDING REVIEW ONLY/);
assert.match(migration, /create or replace function public\.create_transactional_checkout/);
assert.match(migration, /grant execute on function public\.create_transactional_checkout[\s\S]*to service_role/);
assert.match(migration, /set search_path = ''/);
assert.match(migration, /store_inventory_reservations/);
assert.match(migration, /expires_at/);
assert.match(migration, /release_reason/);
assert.match(setup, /disposable Supabase project/);
assert.match(setup, /ZEROCRAFT_TRANSACTIONAL_CHECKOUT_ENABLED=false/);
assert.match(setup, /supabase db push --linked/);
assert.match(plan, /Two-session concurrency strategy/);
assert.match(plan, /Role and RLS matrix/);
assert.match(plan, /Storage tests/);
assert.match(sql, /STAGING_PROJECT_REF/);
assert.match(sql, /CUSTOMER_A_ID/);
assert.match(sql, /begin;/);
assert.match(sql, /rollback;/);
assert.match(sql, /release_order_reservations/);
assert.doesNotMatch(sql, /SUPABASE_SERVICE_ROLE_KEY|sb_secret|postgresql:\/\/[^\s]+:[^\s]+@/i);
assert.doesNotMatch(setup + plan, /supabase_service_role_key\s*=\s*[^\s`]+/i);

console.log("Phase 4E-D staging preparation static checks: PASS");
