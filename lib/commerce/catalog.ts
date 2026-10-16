import "server-only";

import { createClient } from "@/utils/supabase/server";
import { resolveCatalogMoney, resolveCurrencyCode } from "@/lib/commerce/money";
import { normalizeVariantOptions } from "@/lib/commerce/variant-options";

export type CatalogSort = "newest" | "price-asc" | "price-desc" | "title";

export type CatalogProduct = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  category: string;
  categorySlug: string;
  brand: string;
  price: number;
  originalPrice: number;
  pricePaise: number | null;
  currency: string;
  stock: number;
  rating: number;
  reviewCount: number;
  tags: string[];
  colors: { name: string; hex: string }[];
  sizes: string[];
  sku: string;
  shippingBadge: string;
  isNew: boolean;
  isSale: boolean;
  images: string[];
  specifications: { label: string; value: string }[];
  variants: CatalogVariant[];
};

export type CatalogVariant = {
  id: string;
  label: string;
  sku: string;
  options: Record<string, string>;
  price: number;
  pricePaise: number | null;
  currency: string;
  stock: number | null;
};

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  itemCount: number;
};

export type CatalogCollection = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  image: string;
};

export type ProductQuery = {
  page?: number;
  pageSize?: number;
  categorySlug?: string;
  collectionSlug?: string;
  query?: string;
  sort?: CatalogSort;
};

export type PaginatedProducts = {
  products: CatalogProduct[];
  page: number;
  pageSize: number;
  total: number;
};

type ProductRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  sku: string;
  price: number | string | null;
  compare_at_price: number | string | null;
  price_paise?: number | string | null;
  compare_at_price_paise?: number | string | null;
  currency?: string | null;
  currency_code?: string | null;
  stock: number | null;
  image_url: string | null;
  created_at: string;
  category?: { name: string; slug: string }[] | null;
  media?: { public_url: string; alt_text: string; sort_order: number }[];
  variants?: {
    id: string;
    label: string;
    sku: string;
    options: Record<string, string> | null;
    price: number | string | null;
    price_paise: number | string | null;
    currency_code?: string | null;
    stock: number | null;
    is_active?: boolean;
  }[];
};

function toMoney(row: ProductRow) {
  const money = resolveCatalogMoney({
    currency: resolveCurrencyCode(row.currency_code, row.currency),
    price: row.price,
    pricePaise: row.price_paise,
  });
  const originalPrice = row.compare_at_price == null && row.compare_at_price_paise == null
    ? money.amount
    : resolveCatalogMoney({
      currency: money.currency,
      price: row.compare_at_price,
      pricePaise: row.compare_at_price_paise,
    }).amount;
  return {
    pricePaise: money.amountPaise,
    price: money.amount,
    originalPrice,
    currency: money.currency,
  };
}

function mapProduct(row: ProductRow): CatalogProduct {
  const money = toMoney(row);
  const images = (row.media ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((media) => media.public_url)
    .filter((url): url is string => Boolean(url) && !url.includes("placehold.co") && !url.includes("via.placeholder"));
  if (!images.length && row.image_url && !row.image_url.includes("placehold.co") && !row.image_url.includes("via.placeholder")) images.push(row.image_url);
  if (!images.length) {
    const productText = `${row.title} ${row.description ?? ""} ${row.category?.[0]?.name ?? ""}`.toLowerCase();
    images.push(productText.includes("tee") || productText.includes("shirt") || productText.includes("hoodie") || productText.includes("merch")
      ? "/images/products/posterized-merch-collection.png"
      : "/images/products/posterized-art-print-mockup.png");
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: row.description?.slice(0, 140) ?? "",
    description: row.description ?? "",
    category: row.category?.[0]?.name ?? "Store",
    categorySlug: row.category?.[0]?.slug ?? "store",
    brand: "Zerocraft Studio",
    price: money.price,
    originalPrice: money.originalPrice,
    pricePaise: money.pricePaise,
    currency: money.currency,
    stock: row.stock ?? 0,
    rating: 0,
    reviewCount: 0,
    tags: [],
    colors: [],
    sizes: [],
    sku: row.sku,
    shippingBadge: "Made to order",
    isNew: Date.now() - new Date(row.created_at).getTime() < 30 * 24 * 60 * 60 * 1000,
    isSale: money.originalPrice > money.price,
    images,
    specifications: [],
    variants: (row.variants ?? []).filter((variant) => variant.is_active !== false).map((variant) => {
      const currency = resolveCurrencyCode(variant.currency_code, money.currency);
      const variantMoney = resolveCatalogMoney({ currency, price: variant.price, pricePaise: variant.price_paise });
      return {
        id: variant.id,
        label: variant.label,
        sku: variant.sku,
        options: normalizeVariantOptions(variant.options),
        price: variantMoney.amount,
        pricePaise: variantMoney.amountPaise,
        currency: variantMoney.currency,
        stock: variant.stock,
      };
    }),
  };
}

async function getCollectionProductIds(supabase: Awaited<ReturnType<typeof createClient>>, slug: string) {
  const { data, error } = await supabase
    .from("store_collection_products")
    .select("product_id,collection:store_collections!inner(slug,status)")
    .eq("collection.slug", slug)
    .eq("collection.status", "published");
  if (error) throw new Error(`Collection query failed: ${error.message}`);
  return (data ?? []).map((row) => (row as { product_id: string }).product_id);
}

export async function getProducts(query: ProductQuery = {}): Promise<PaginatedProducts> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, query.pageSize ?? 24));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const supabase = await createClient();
  const collectionIds = query.collectionSlug ? await getCollectionProductIds(supabase, query.collectionSlug) : null;
  const buildRequest = () => {
    const select = "id,slug,title,description,sku,price,compare_at_price,price_paise,compare_at_price_paise,currency,currency_code,stock,image_url,created_at,category:store_categories(name,slug),media:store_product_media(public_url,alt_text,sort_order),variants:store_product_variants(id,label,sku,options,price,price_paise,currency_code,stock,is_active)";
    let request = supabase.from("store_products").select(select, { count: "exact" }).eq("status", "active");
    if (collectionIds) request = request.in("id", collectionIds);
    if (query.categorySlug) request = request.eq("store_categories.slug", query.categorySlug);
    if (query.query?.trim()) request = request.ilike("title", `%${query.query.trim()}%`);
    if (query.sort === "price-asc") request = request.order("price_paise", { ascending: true, nullsFirst: false });
    else if (query.sort === "price-desc") request = request.order("price_paise", { ascending: false, nullsFirst: false });
    else if (query.sort === "title") request = request.order("title", { ascending: true });
    else request = request.order("created_at", { ascending: false });
    return request.range(from, to);
  };
  const { data, error, count } = await buildRequest();
  if (error) throw new Error(`Catalog query failed: ${error.message}`);
  return { products: ((data ?? []) as unknown as ProductRow[]).map(mapProduct), page, pageSize, total: count ?? 0 };
}

export async function getProductBySlug(slug: string): Promise<CatalogProduct | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("store_products").select("id,slug,title,description,sku,price,compare_at_price,price_paise,compare_at_price_paise,currency,currency_code,stock,image_url,created_at,category:store_categories(name,slug),media:store_product_media(public_url,alt_text,sort_order),variants:store_product_variants(id,label,sku,options,price,price_paise,currency_code,stock,is_active)").eq("slug", slug).eq("status", "active").maybeSingle();
  if (error) throw new Error(`Product query failed: ${error.message}`);
  return data ? mapProduct(data as unknown as ProductRow) : null;
}

export async function getProductById(id: string): Promise<CatalogProduct | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("store_products").select("id,slug,title,description,sku,price,compare_at_price,price_paise,compare_at_price_paise,currency,currency_code,stock,image_url,created_at,category:store_categories(name,slug),media:store_product_media(public_url,alt_text,sort_order),variants:store_product_variants(id,label,sku,options,price,price_paise,currency_code,stock,is_active)").eq("id", id).eq("status", "active").maybeSingle();
  if (error) throw new Error(`Product query failed: ${error.message}`);
  return data ? mapProduct(data as unknown as ProductRow) : null;
}

export async function getCategories(): Promise<CatalogCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_categories")
    .select("id,name,slug,description,image_url,store_products(count)")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(`Category query failed: ${error.message}`);
  return (data ?? []).map((row) => {
    const value = row as unknown as { id: string; name: string; slug: string; description: string; image_url: string; store_products?: { count: number }[] };
    return { id: value.id, name: value.name, slug: value.slug, description: value.description, image: value.image_url, itemCount: value.store_products?.[0]?.count ?? 0 };
  });
}

export async function getCollections(): Promise<CatalogCollection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("store_collections").select("id,name,slug,tagline,description,image_url").eq("status", "published").order("name");
  if (error) throw new Error(`Collection query failed: ${error.message}`);
  return (data ?? []).map((row) => {
    const value = row as unknown as { id: string; name: string; slug: string; tagline: string; description: string; image_url: string };
    return { id: value.id, name: value.name, slug: value.slug, tagline: value.tagline, description: value.description, image: value.image_url };
  });
}

export async function getFeaturedProducts(limit = 8): Promise<CatalogProduct[]> {
  const result = await getProducts({ page: 1, pageSize: Math.min(limit, 48), sort: "newest" });
  return result.products;
}

export async function getProductVariants(productId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("store_product_variants").select("id,product_id,label,sku,options,price,price_paise,currency_code,stock,is_active").eq("product_id", productId).eq("is_active", true).order("label");
  if (error) throw new Error(`Variant query failed: ${error.message}`);
  return data ?? [];
}

export async function getRelatedProducts(productId: string, categorySlug: string, limit = 4) {
  const result = await getProducts({ page: 1, pageSize: Math.min(limit + 1, 48), categorySlug });
  return result.products.filter((product) => product.id !== productId).slice(0, limit);
}
