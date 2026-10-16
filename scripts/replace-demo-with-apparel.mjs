import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase credentials. Run with --env-file=.env.local");
const supabase = createClient(url, key, { auth: { persistSession: false } });

const teeImage = "/images/products/posterized-tee-drop.png";
const coupleImage = "/images/products/posterized-couple-tees.png";
const tshirts = [
  ["zerolines-core-oversized-tee", "Zero Lines Core Oversized Tee", "Minimal cobalt and vermilion graphic on a heavyweight oversized tee.", 899],
  ["tamil-form-type-tee", "Tamil Form Type Tee", "A clean Tamil-form inspired graphic tee with premium screen-print ink.", 949],
  ["redline-club-tee", "Redline Club Graphic Tee", "A bold redline poster graphic on soft heavyweight cotton.", 899],
  ["night-shift-graphic-tee", "Night Shift Graphic Tee", "Indigo night-shift artwork made for late studio sessions.", 999],
  ["colour-study-oversized-tee", "Colour Study Oversized Tee", "A limited palette colour-study tee in a relaxed drop shoulder fit.", 1099],
].map(([slug, title, description, price], index) => ({ slug, title, description, price, sku: `ZC-TEE-${String(index + 1).padStart(2, "0")}`, image_url: teeImage, stock: 30 }));

const couples = [
  ["two-of-us-coordinate-set", "Two Of Us Coordinate Set", "Matching posterized coordinate tees for two, printed on soft heavyweight cotton.", 1699],
  ["match-point-couple-tee-set", "Match Point Couple Tee Set", "A playful paired graphic set with two complementary prints.", 1799],
  ["orbit-pair-tee-set", "Orbit Pair Tee Set", "A minimal celestial-inspired matching tee set for everyday wear.", 1699],
  ["afterglow-couple-tee-set", "Afterglow Couple Tee Set", "Warm sunset colours and clean typography-inspired geometry for two.", 1899],
  ["sunday-cinema-couple-tee-set", "Sunday Cinema Couple Tee Set", "A relaxed cinema-night inspired matching set for weekend plans.", 1799],
].map(([slug, title, description, price], index) => ({ slug, title, description, price, sku: `ZC-COUPLE-${String(index + 1).padStart(2, "0")}`, image_url: coupleImage, stock: 18 }));

async function idsBy(table, column, values) {
  if (!values.length) return [];
  const { data, error } = await supabase.from(table).select(`id,${column}`).in(column, values);
  if (error) throw new Error(`${table} lookup: ${error.message}`);
  return data ?? [];
}

const { data: demoProducts, error: demoError } = await supabase.from("store_products").select("id,slug").like("slug", "demo-%");
if (demoError) throw new Error(`Demo lookup: ${demoError.message}`);
const demoProductIds = (demoProducts ?? []).map((row) => row.id);
const demoVariants = await idsBy("store_product_variants", "product_id", demoProductIds);
const demoVariantIds = demoVariants.map((row) => row.id);

const [orderItems, reservations] = await Promise.all([
  demoProductIds.length ? supabase.from("store_order_items").select("id", { count: "exact", head: true }).in("product_id", demoProductIds) : { count: 0, error: null },
  demoVariantIds.length ? supabase.from("store_inventory_reservations").select("id", { count: "exact", head: true }).in("variant_id", demoVariantIds) : { count: 0, error: null },
]);
if (orderItems.error) throw new Error(`Order reference check: ${orderItems.error.message}`);
if (reservations.error) throw new Error(`Reservation reference check: ${reservations.error.message}`);
if ((orderItems.count ?? 0) > 0 || (reservations.count ?? 0) > 0) throw new Error("Demo products have order or inventory reservation history; refusing destructive deletion.");

async function removeBy(table, column, values) {
  if (!values.length) return;
  const { error } = await supabase.from(table).delete().in(column, values);
  if (error && !/relation .* does not exist/i.test(error.message)) throw new Error(`${table} cleanup: ${error.message}`);
}

await removeBy("store_cart_items", "variant_id", demoVariantIds);
await removeBy("store_inventory_movements", "variant_id", demoVariantIds);
await removeBy("store_inventory_levels", "variant_id", demoVariantIds);
await removeBy("store_inventory_transfer_items", "variant_id", demoVariantIds);
await removeBy("store_purchase_order_items", "variant_id", demoVariantIds);
await removeBy("store_variant_values", "variant_id", demoVariantIds);
await removeBy("store_collection_products", "product_id", demoProductIds);
await removeBy("store_product_media", "product_id", demoProductIds);
await removeBy("store_customization_templates", "product_id", demoProductIds);
const demoOptions = await idsBy("store_variant_options", "product_id", demoProductIds);
await removeBy("store_variant_option_values", "option_id", demoOptions.map((row) => row.id));
await removeBy("store_variant_options", "product_id", demoProductIds);
await removeBy("store_product_variants", "product_id", demoProductIds);
await removeBy("store_products", "id", demoProductIds);

async function categoryId(slug, name) {
  const { data, error } = await supabase.from("store_categories").upsert({ slug, name, description: `${name} made for the Zerocraft print studio.`, image_url: teeImage, is_active: true }, { onConflict: "slug" }).select("id").single();
  if (error) throw new Error(`Category ${slug}: ${error.message}`);
  return data.id;
}

const teeCategory = await categoryId("t-shirts", "T-Shirts");
const coupleCategory = await categoryId("couples-t-shirts", "Couples T-Shirts");
const productRows = [...tshirts.map((product) => ({ ...product, category_id: teeCategory })), ...couples.map((product) => ({ ...product, category_id: coupleCategory }))].map((product) => ({ ...product, product_type: "physical", status: "active", currency: "INR", currency_code: "INR", price_paise: product.price * 100, compare_at_price: product.price + 300, compare_at_price_paise: (product.price + 300) * 100 }));
const { data: stored, error: productError } = await supabase.from("store_products").upsert(productRows, { onConflict: "slug" }).select("id,slug,sku");
if (productError) throw new Error(`Apparel products: ${productError.message}`);
const bySlug = new Map(stored.map((row) => [row.slug, row]));

const singleVariants = ["S", "M", "L", "XL", "XXL"];
const coupleVariants = ["S + S", "M + M", "L + L", "XL + XL", "M + L"];
const variantRows = [...tshirts.flatMap((product) => singleVariants.map((size) => ({ product, label: size, options: { Size: size }, surcharge: size === "XXL" ? 100 : 0 }))), ...couples.flatMap((product) => coupleVariants.map((size) => ({ product, label: size, options: { Pair: size }, surcharge: size === "XL + XL" ? 100 : 0 })))].map(({ product, label, options, surcharge }) => {
  const storedProduct = bySlug.get(product.slug);
  return { product_id: storedProduct.id, label, sku: `${product.sku}-${label.replaceAll(" ", "").replaceAll("+", "PLUS")}`, options, price: product.price + surcharge, price_paise: (product.price + surcharge) * 100, currency_code: "INR", stock: product.stock, is_active: true };
});
const { error: variantError } = await supabase.from("store_product_variants").upsert(variantRows, { onConflict: "sku" });
if (variantError) throw new Error(`Apparel variants: ${variantError.message}`);

console.log(`Removed ${demoProductIds.length} demo products and created ${tshirts.length} T-shirts + ${couples.length} couple sets with ${variantRows.length} variants.`);
