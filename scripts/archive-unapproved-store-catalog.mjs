import { createClient } from "@supabase/supabase-js";

// Safe-by-default review tool. It never deletes rows. Run without --apply to
// inspect candidates, then use --apply only after reviewing the output.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase credentials. Run with --env-file=.env.local");
const supabase = createClient(url, key, { auth: { persistSession: false } });
const apply = process.argv.includes("--apply");
const legacyCategorySlugs = ["digital-products", "brand-systems", "studio-goods", "limited-edition", "digital-artwork", "illustrative-art", "custom-posters", "couples-t-shirts", "keychains-tags", "tamil-typography"];

const { data: products, error: productError } = await supabase
  .from("store_products")
  .select("id,slug,title,status,category_id,store_categories(slug)");
if (productError) throw new Error(`Candidate lookup failed: ${productError.message}`);

const candidates = (products || []).filter((product) => product.slug.startsWith("demo-") || legacyCategorySlugs.includes(product.store_categories?.slug));
console.log(`${apply ? "APPLY MODE" : "DRY RUN"}: ${candidates.length} candidate products`);
for (const product of candidates) console.log(`- ${product.slug} [${product.status}]`);
if (!apply || !candidates.length) {
  console.log("Review complete. No database changes were made.");
} else {

for (const product of candidates) {
  const { count: orderCount, error: orderError } = await supabase.from("store_order_items").select("id", { count: "exact", head: true }).eq("product_id", product.id);
  if (orderError) throw new Error(`Order reference check failed for ${product.slug}: ${orderError.message}`);
  const { data: variants, error: variantError } = await supabase.from("store_product_variants").select("id").eq("product_id", product.id);
  if (variantError) throw new Error(`Variant lookup failed for ${product.slug}: ${variantError.message}`);
  const variantIds = (variants || []).map((variant) => variant.id);
  const { count: reservationCount, error: reservationError } = variantIds.length
    ? await supabase.from("store_inventory_reservations").select("id", { count: "exact", head: true }).in("variant_id", variantIds)
    : { count: 0, error: null };
  if (reservationError && !/relation .* does not exist/i.test(reservationError.message)) throw new Error(`Reservation reference check failed for ${product.slug}: ${reservationError.message}`);
  const { error } = await supabase.from("store_products").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", product.id);
  if (error) throw new Error(`Archive failed for ${product.slug}: ${error.message}`);
  console.log(`Archived ${product.slug}; preserved order refs=${orderCount || 0}, reservations=${reservationCount || 0}`);
}

const { error: categoryError } = await supabase.from("store_categories").update({ is_active: false, updated_at: new Date().toISOString() }).in("slug", legacyCategorySlugs);
if (categoryError) throw new Error(`Legacy category archive failed: ${categoryError.message}`);
console.log("Legacy categories hidden. No rows were deleted.");
}
