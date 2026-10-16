import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const envText = await fs.readFile(path.resolve(".env.local"), "utf8");
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^\s*([^#=][^=]*)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase environment configuration.");
const supabase = createClient(url, key, { auth: { persistSession: false } });
const read = async (table, columns) => {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
};
const snapshot = {
  captured_at: new Date().toISOString(),
  project_ref: "jamyqssytdzbiiahtmsq",
  products: await read("store_products", "id,sku,slug,title,description,product_type,status,price,compare_at_price,price_paise,compare_at_price_paise,currency,currency_code,stock,category_id,image_url"),
  categories: await read("store_categories", "id,slug,name,description,image_url,is_active"),
  collections: await read("store_collections", "id,slug,name,tagline,description,image_url,status"),
  orders: await read("store_orders", "id,total,currency,status,payment_status"),
  media: await read("store_product_media", "id,product_id,variant_id,storage_path,public_url,alt_text,media_type,sort_order,is_primary"),
  variants: await read("store_product_variants", "id,product_id,label,sku,options,price,price_paise,currency_code,stock,is_active"),
  variant_options: await read("store_variant_options", "id,product_id,name,sort_order"),
  option_values: await read("store_variant_option_values", "id,option_id,value,swatch_hex,sort_order"),
  variant_values: await read("store_variant_values", "variant_id,option_value_id"),
};
await fs.mkdir(path.resolve(".seed-preflight"), { recursive: true });
await fs.writeFile(path.resolve(".seed-preflight/pre-resume-snapshot.json"), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ project_ref: snapshot.project_ref, counts: Object.fromEntries(Object.entries(snapshot).filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, value.length])), manifest: ".seed-preflight/pre-resume-snapshot.json" }, null, 2));
