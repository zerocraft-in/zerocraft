import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const envText = await fs.readFile(path.resolve(".env.local"), "utf8");
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^\s*([^#=][^=]*)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
}
const snapshot = JSON.parse(await fs.readFile(path.resolve(".seed-preflight/pre-resume-snapshot.json"), "utf8"));
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const read = async (table, columns) => {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
};
const normalize = (rows) => rows.map((row) => JSON.stringify(row)).sort();
const definitions = {
  products: ["store_products", "id,sku,slug,title,description,product_type,status,price,compare_at_price,price_paise,compare_at_price_paise,currency,currency_code,stock,category_id,image_url"],
  categories: ["store_categories", "id,slug,name,description,image_url,is_active"],
  collections: ["store_collections", "id,slug,name,tagline,description,image_url,status"],
  orders: ["store_orders", "id,total,currency,status,payment_status"],
  media: ["store_product_media", "id,product_id,variant_id,storage_path,public_url,alt_text,media_type,sort_order,is_primary"],
  variants: ["store_product_variants", "id,product_id,label,sku,options,price,price_paise,currency_code,stock,is_active"],
  variant_options: ["store_variant_options", "id,product_id,name,sort_order"],
  option_values: ["store_variant_option_values", "id,option_id,value,swatch_hex,sort_order"],
  variant_values: ["store_variant_values", "variant_id,option_value_id"],
};
const comparisons = {};
for (const [key, [table, columns]] of Object.entries(definitions)) {
  const current = await read(table, columns);
  const previous = snapshot[key] ?? [];
  const currentById = new Map(current.map((row) => [row.id ?? `${row.variant_id}:${row.option_value_id}`, row]));
  const preserved = previous.map((row) => currentById.get(row.id ?? `${row.variant_id}:${row.option_value_id}`)).filter(Boolean);
  comparisons[key] = {
    previous: previous.length,
    preserved: preserved.length,
    unchanged: preserved.length === previous.length && JSON.stringify(normalize(preserved)) === JSON.stringify(normalize(previous)),
  };
}
console.log(JSON.stringify(comparisons, null, 2));
if (Object.values(comparisons).some((result) => !result.unchanged)) process.exitCode = 1;
