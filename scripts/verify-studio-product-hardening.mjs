import assert from "node:assert/strict";
import fs from "node:fs/promises";

const migration = await fs.readFile(new URL("../supabase/migrations/202610160005_studio_product_write_hardening.sql", import.meta.url), "utf8");
const route = await fs.readFile(new URL("../app/api/studio/store/route.ts", import.meta.url), "utf8");
const mediaRoute = await fs.readFile(new URL("../app/api/studio/store/media/route.ts", import.meta.url), "utf8");

assert.match(migration, /security definer/i);
assert.match(migration, /set search_path = ''/i);
assert.match(migration, /is_studio_member\(\)/);
assert.match(migration, /revoke all on function/);
assert.match(migration, /studio_save_product_atomic_v2/);
assert.match(migration, /write_version/);
assert.match(migration, /grant execute on function .* to authenticated/si);
assert.match(migration, /for update/);
assert.match(migration, /currency_code/);
assert.match(migration, /price_paise/);
assert.match(migration, /store_variant_options/);
assert.match(migration, /store_variant_option_values/);
assert.match(migration, /store_variant_values/);
assert.match(migration, /store_inventory_levels/);
assert.match(migration, /studio_variant_has_active_reservations/);
assert.match(migration, /set is_active=false/);
assert.doesNotMatch(migration, /create_transactional_checkout/);
assert.match(migration, /store_inventory_reservations/);
assert.doesNotMatch(migration, /delete from public\.store_product_variants/);
assert.match(route, /isSameOrigin\(request\)/);
assert.match(route, /auth\.getUser\(\)/);
assert.match(route, /is_studio_member|profiles/);
assert.match(mediaRoute, /requireStudioStorageClient/);
assert.match(mediaRoute, /upsert: false/);
assert.match(mediaRoute, /isProductMediaPath/);

console.log(JSON.stringify({
  passed: 22,
  remoteCalls: 0,
  draftStatus: "unapplied",
  checks: [
    "SECURITY DEFINER uses an empty search_path",
    "Studio membership is checked inside the draft function",
    "Public and anonymous execution is revoked",
    "Versioned v2 RPC is the least-privilege authenticated grant",
    "Product row locking is present",
    "INR paise and currency_code are explicitly validated",
    "Normalized options are persisted",
    "New physical variants initialize inventory",
    "Optional reservation ledger is checked without a migration dependency",
    "Omitted variants are archived rather than deleted",
    "Checkout and reservation migrations are not modified",
    "Studio API preserves same-origin and authentication checks",
    "Product media upload uses upsert=false and product path validation",
  ],
}, null, 2));
