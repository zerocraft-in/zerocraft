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
if (!url.includes("jamyqssytdzbiiahtmsq")) throw new Error("Unexpected Supabase project URL.");

const supabase = createClient(url, key, { auth: { persistSession: false } });
const read = async (table, columns = "*") => {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
};

const products = await read("store_products", "id,sku,slug,price,price_paise,compare_at_price,compare_at_price_paise,currency,currency_code,status");
const orders = await read("store_orders", "id,total,currency,status");
const media = await read("store_product_media", "id,product_id,variant_id,storage_path,public_url");
const counts = {};
for (const table of ["store_products", "store_categories", "store_product_variants", "store_orders", "store_collections", "store_customization_templates", "store_collection_products", "store_variant_options", "store_variant_option_values", "store_variant_values", "store_inventory_locations", "store_inventory_levels", "storefront_sections", "storefront_banners", "store_product_media"]) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  counts[table] = count ?? 0;
}

const manifest = {
  captured_at: new Date().toISOString(),
  project_ref: "jamyqssytdzbiiahtmsq",
  counts,
  products,
  orders,
  media,
};
await fs.mkdir(path.resolve(".seed-preflight"), { recursive: true });
await fs.writeFile(path.resolve(".seed-preflight/baseline.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ project_ref: manifest.project_ref, counts: manifest.counts, manifest: ".seed-preflight/baseline.json" }, null, 2));
