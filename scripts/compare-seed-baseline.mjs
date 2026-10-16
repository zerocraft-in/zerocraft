import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const envText = await fs.readFile(path.resolve(".env.local"), "utf8");
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^\s*([^#=][^=]*)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
}

const baseline = JSON.parse(await fs.readFile(path.resolve(".seed-preflight/baseline.json"), "utf8"));
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const read = async (table, columns) => {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
};
const normalize = (rows) => rows.map((row) => JSON.stringify(row)).sort();
const products = await read("store_products", "id,sku,slug,price,price_paise,compare_at_price,compare_at_price_paise,currency,currency_code,status");
const orders = await read("store_orders", "id,total,currency,status");
const media = await read("store_product_media", "id,product_id,variant_id,storage_path,public_url");
const originalProducts = products.filter((row) => baseline.products.some((expected) => expected.id === row.id));
const result = {
  originalProductsUnchanged: JSON.stringify(normalize(originalProducts)) === JSON.stringify(normalize(baseline.products)),
  originalOrdersUnchanged: JSON.stringify(normalize(orders)) === JSON.stringify(normalize(baseline.orders)),
  existingMediaUnchanged: JSON.stringify(normalize(media)) === JSON.stringify(normalize(baseline.media)),
  originalProductCount: originalProducts.length,
  originalOrderCount: orders.length,
  mediaCount: media.length,
  demoProductCount: products.filter((row) => row.slug.startsWith("demo-")).length,
};
if (!result.originalProductsUnchanged || !result.originalOrdersUnchanged || !result.existingMediaUnchanged) process.exitCode = 1;
console.log(JSON.stringify(result, null, 2));
