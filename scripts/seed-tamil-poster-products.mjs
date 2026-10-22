import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase credentials. Run with --env-file=.env.local");

const supabase = createClient(url, key, { auth: { persistSession: false } });

const products = [
  {
    slug: "vikram-agent-redline-art-print",
    sku: "TAMIL-VIKRAM-POSTER",
    title: "Vikram — Agent Redline Art Print",
    description: "An original posterized screen-print artwork inspired by the covert-agent energy of Vikram. Limited red, graphite and cream palette on museum-grade matte paper. Unofficial fan-inspired artwork; not affiliated with the film or its rights holders.",
    image_url: "/images/products/tamil-vikram-agent-poster.png",
    price: 399,
    compare_at_price: 599,
    stock: 24,
  },
  {
    slug: "jailer-tiger-code-art-print",
    sku: "TAMIL-JAILER-POSTER",
    title: "Jailer — Tiger Code Art Print",
    description: "A bold original tiger-and-bar composition inspired by the raw attitude of Jailer. Printed with archival inks on heavyweight matte paper. Unofficial fan-inspired artwork; not affiliated with the film or its rights holders.",
    image_url: "/images/products/tamil-jailer-tiger-poster.png",
    price: 399,
    compare_at_price: 599,
    stock: 22,
  },
  {
    slug: "kaithi-midnight-route-art-print",
    sku: "TAMIL-KAITHI-POSTER",
    title: "Kaithi — Midnight Route Art Print",
    description: "A night-road screen-print study inspired by Kaithi's tense journey through the dark. Indigo, rust and cream inks on 300 GSM archival paper. Unofficial fan-inspired artwork; not affiliated with the film or its rights holders.",
    image_url: "/images/products/tamil-kaithi-night-poster.png",
    price: 399,
    compare_at_price: 599,
    stock: 20,
  },
  {
    slug: "96-rain-and-memory-art-print",
    sku: "TAMIL-96-POSTER",
    title: "96 — Rain & Memory Art Print",
    description: "A nostalgic original composition built from rain, old cameras and distance, inspired by the emotional world of 96. Soft teal, coral and cream screen-print palette. Unofficial fan-inspired artwork; not affiliated with the film or its rights holders.",
    image_url: "/images/products/tamil-96-romance-poster.png",
    price: 399,
    compare_at_price: 599,
    stock: 18,
  },
  {
    slug: "vaaranam-aayiram-road-song-art-print",
    sku: "TAMIL-VAARANAM-POSTER",
    title: "Vaaranam Aayiram — Road Song Art Print",
    description: "A warm road-trip posterized artwork inspired by the travel, music and freedom of Vaaranam Aayiram. Mustard, cobalt and black inks on 300 GSM matte paper. Unofficial fan-inspired artwork; not affiliated with the film or its rights holders.",
    image_url: "/images/products/tamil-vaaranam-aayiram-road-poster.png",
    price: 399,
    compare_at_price: 599,
    stock: 21,
  },
];

const variantBlueprint = [
  ["A4 · Unframed", "A4", "Unframed", 0],
  ["A3 · Unframed", "A3", "Unframed", 200],
  ["A3 · Black frame", "A3", "Black frame", 700],
];

const { data: category, error: categoryError } = await supabase
  .from("store_categories")
  .upsert({ slug: "tamil-movie-posters", name: "Tamil Movie Posters", description: "Original Tamil-cinema-inspired posterized art prints.", image_url: "/images/products/tamil-vikram-agent-poster.png", is_active: true }, { onConflict: "slug" })
  .select("id")
  .single();
if (categoryError) throw new Error(`Category: ${categoryError.message}`);

const productRows = products.map((product) => ({
  ...product,
  category_id: category.id,
  product_type: "physical",
  status: "active",
  currency: "INR",
  currency_code: "INR",
  price_paise: product.price * 100,
  compare_at_price_paise: product.compare_at_price * 100,
}));
const { data: storedProducts, error: productError } = await supabase
  .from("store_products")
  .upsert(productRows, { onConflict: "slug" })
  .select("id,slug,sku");
if (productError) throw new Error(`Products: ${productError.message}`);

const productBySlug = new Map(storedProducts.map((product) => [product.slug, product]));
const variantRows = products.flatMap((product) => {
  const stored = productBySlug.get(product.slug);
  if (!stored) throw new Error(`Product readback missing: ${product.slug}`);
  return variantBlueprint.map(([label, size, finish, surcharge]) => ({
    product_id: stored.id,
    label,
    sku: `${product.sku}-${size}-${finish.replaceAll(" ", "-").toUpperCase()}`,
    options: { Size: size, Finish: finish },
    price: product.price + surcharge,
    price_paise: (product.price + surcharge) * 100,
    currency_code: "INR",
    stock: product.stock,
    is_active: true,
  }));
});
const { error: variantError } = await supabase.from("store_product_variants").upsert(variantRows, { onConflict: "sku" });
if (variantError) throw new Error(`Variants: ${variantError.message}`);

console.log(`Tamil poster catalog ready: ${products.length} products, ${variantRows.length} variants, category ${category.id}.`);

