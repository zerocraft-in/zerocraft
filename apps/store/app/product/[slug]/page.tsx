import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getProducts } from "@/lib/commerce/catalog";
import {
  catalogProductToStoreProduct,
  catalogProductsToStoreProducts,
} from "@/lib/commerce/storefront-product";
import Art from "@/components/sections/Art";
import ProductPanel from "@/components/sections/ProductPanel";
import ProductCard from "@/components/sections/ProductCard";

// Catalog data is request-bound through Supabase cookies, so this route must
// render dynamically instead of calling the database during static generation.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  const p = product ? catalogProductToStoreProduct(product) : null;
  return p
    ? { title: p.n, description: `${p.n} · ${p.sub} by Zerocraft Store` }
    : {};
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const product = await getProductBySlug((await params).slug);
  const first = await getProducts({ page: 1, pageSize: 48 });
  const second =
    first.total > 48
      ? await getProducts({ page: 2, pageSize: 48 })
      : { products: [] };
  const allProducts = [...first.products, ...second.products];
  const p = product
    ? catalogProductToStoreProduct(
        product,
        Math.max(
          0,
          allProducts.findIndex((item) => item.id === product.id),
        ),
      )
    : null;
  if (!p || !product) notFound();
  const related = catalogProductsToStoreProducts(
    allProducts.filter((item) => item.categorySlug === product.categorySlug),
  )
    .filter((x) => x.slug !== p.slug)
    .slice(0, 4);
  return (
    <div className="storefront-container">
      <div className="product-breadcrumb storefront-mono">
        <Link href="/">Home</Link> /{" "}
        <Link href={`/shop?cat=${p.c}`}>{p.c}</Link> / {p.n}
      </div>
      <div className="product-detail">
        <div className="product-detail__media">
          <Art p={p} k="d" />
        </div>
        <div>
          <ProductPanel p={p} h1 />
        </div>
      </div>
      {related.length > 0 && (
        <section style={{ paddingTop: 0 }}>
          <div className="storefront-section-heading">
            <h2
              className="storefront-display"
              style={{ fontSize: "clamp(36px,5vw,64px)" }}
            >
              You may also{" "}
              <em style={{ fontStyle: "normal", color: "var(--red)" }}>
                like.
              </em>
            </h2>
          </div>
          <div className="product-grid">
            {related.map((r) => (
              <ProductCard key={r.id} p={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
