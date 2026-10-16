import assert from "node:assert/strict";
import fs from "node:fs/promises";

const studioRoute = await fs.readFile(new URL("../app/api/studio/store/route.ts", import.meta.url), "utf8");
const catalogRoute = await fs.readFile(new URL("../app/api/store/catalog/route.ts", import.meta.url), "utf8");
const catalog = await fs.readFile(new URL("../lib/commerce/catalog.ts", import.meta.url), "utf8");
const productPage = await fs.readFile(new URL("../app/(store)/store/product/[id]/page.tsx", import.meta.url), "utf8");

assert.match(studioRoute, /store_product_variants\(id,label,sku,options,price,price_paise,currency_code,stock,is_active/);
assert.doesNotMatch(studioRoute, /store_product_variants\([^)]*\bcurrency\s*,/);
assert.doesNotMatch(studioRoute, /store_inventory_levels\(id,/);
assert.doesNotMatch(studioRoute, /Apply supabase\/studio-store-catalog\.sql/);
assert.match(studioRoute, /42P01/);
assert.match(studioRoute, /42501/);
assert.match(catalogRoute, /getProductById/);
assert.match(catalogRoute, /searchParams\.get\("id"\)/);
assert.match(catalog, /export async function getProductById/);
assert.match(catalog, /\.eq\("id", id\)\.eq\("status", "active"\)/);
assert.match(productPage, /\/api\/store\/catalog\?id=/);
assert.doesNotMatch(catalog, /@\/lib\/data\/storeData/);

console.log(JSON.stringify({
  passed: 12,
  remoteCalls: 0,
  checks: [
    "Studio query uses deployed currency_code variant field",
    "Studio no longer recommends obsolete catalog SQL",
    "Studio classifies missing-table, schema, and permission errors",
    "Store catalog API supports product-id lookup",
    "Product detail uses product-id lookup",
    "Published status remains enforced",
    "Catalog has no static data authority",
  ],
}, null, 2));
