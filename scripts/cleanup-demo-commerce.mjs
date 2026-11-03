import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = JSON.parse(process.env.STORE_SERVER_SECRETS || "{}").zerocraft?.serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing tenant Supabase credentials. Run with --env-file=apps/cms/.env.local");

const supabase = createClient(url, key, { auth: { persistSession: false } });
const apply = process.argv.includes("--apply");
const fixedSeedProductIds = Array.from({ length: 8 }, (_, index) => `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`);
const fixedSeedOrderIds = Array.from({ length: 10 }, (_, index) => `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`);

async function select(table, columns, filters = {}) {
  let query = supabase.from(table).select(columns);
  for (const [column, values] of Object.entries(filters)) query = query.in(column, values);
  const result = await query;
  if (result.error) throw new Error(`${table} lookup: ${result.error.message}`);
  return result.data || [];
}

async function remove(table, column, values) {
  if (!values.length) return;
  const result = await supabase.from(table).delete().in(column, values);
  if (result.error && !/relation .* does not exist/i.test(result.error.message)) throw new Error(`${table} cleanup: ${result.error.message}`);
  console.log(`${apply ? "deleted" : "would delete"} ${values.length} ${table}`);
}

const { data: products, error: productError } = await supabase.from("products").select("id,slug,sku,title,description,category_id,subcategory_id");
if (productError) throw new Error(`products lookup: ${productError.message}`);
const demoProducts = (products || []).filter((product) =>
  fixedSeedProductIds.includes(product.id) ||
  product.slug === "qa-variant-inventory-product" ||
  String(product.sku || "").startsWith("ZC-DEMO-") ||
  String(product.description || "").toLowerCase().includes("development demo product"),
);
const productIds = demoProducts.map((product) => product.id);
const variants = await select("variants", "id,product_id", { product_id: productIds });
const variantIds = variants.map((variant) => variant.id);
const options = await select("product_options", "id,product_id", { product_id: productIds });
const optionIds = options.map((option) => option.id);
const categories = await supabase.from("categories").select("id,slug,name,description");
if (categories.error) throw new Error(`categories lookup: ${categories.error.message}`);
const demoCategories = (categories.data || []).filter((category) => String(category.description || "").toLowerCase().includes("demo") || category.slug === "qa-temporary-category");
const categoryIds = demoCategories.map((category) => category.id);
const subcategories = await select("subcategories", "id,category_id", { category_id: categoryIds });
const subcategoryIds = subcategories.map((subcategory) => subcategory.id);

console.log(JSON.stringify({ apply, demoProducts: demoProducts.map(({ id, slug, sku, title }) => ({ id, slug, sku, title })), demoCategories, demoOrders: fixedSeedOrderIds }, null, 2));
if (!apply) {
  console.log("Dry run only. Re-run with --apply to remove these explicit demo/test records.");
  process.exit(0);
}

// Remove order references before deleting seeded fake orders.
await remove("payment_submissions", "order_id", fixedSeedOrderIds);
await remove("payment_attempts", "order_id", fixedSeedOrderIds);
await remove("inventory_reservations", "order_id", fixedSeedOrderIds);
await remove("orders", "id", fixedSeedOrderIds);

// Remove product references that use restrictive foreign keys.
await remove("bundle_items", "product_id", productIds);
await remove("cart_items", "variant_id", variantIds);
await remove("inventory_reservations", "variant_id", variantIds);
await remove("inventory_movements", "variant_id", variantIds);
await remove("transfer_items", "variant_id", variantIds);
await remove("purchase_order_items", "variant_id", variantIds);
await remove("variant_option_values", "variant_id", variantIds);
await remove("variant_option_values", "option_value_id", optionIds);
await remove("option_values", "option_id", optionIds);
await remove("product_options", "id", optionIds);
await remove("products", "id", productIds);

// Remove only demo taxonomy that is no longer referenced by any remaining product.
const remainingProducts = await select("products", "id,category_id,subcategory_id");
const usedCategoryIds = new Set(remainingProducts.map((product) => product.category_id).filter(Boolean));
const usedSubcategoryIds = new Set(remainingProducts.map((product) => product.subcategory_id).filter(Boolean));
await remove("subcategories", "id", subcategoryIds.filter((id) => !usedSubcategoryIds.has(id)));
await remove("categories", "id", categoryIds.filter((id) => !usedCategoryIds.has(id)));

console.log(`Demo cleanup ${apply ? "completed" : "planned"}.`);
