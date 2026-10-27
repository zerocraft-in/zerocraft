import Link from "next/link";
import Marquee from "@/components/Marquee";
import CatalogProductCard from "@/components/CatalogProductCard";
import { getCategories, getProducts } from "@/lib/commerce/catalog";

export const metadata = { title: "Shop all | ZeroCraft" };

type ShopSearchParams = { cat?: string; q?: string; sort?: string };

const SORT_OPTIONS = [
  ["featured", "Featured", "newest"],
  ["low", "Price ↑", "price-asc"],
  ["high", "Price ↓", "price-desc"],
  ["title", "A–Z", "title"],
] as const;

export default async function Shop({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const params = await searchParams;
  const categorySlug =
    params.cat && params.cat !== "all" ? params.cat : undefined;
  const query = params.q?.trim() ?? "";
  const selectedSort = SORT_OPTIONS.some(([key]) => key === params.sort)
    ? params.sort!
    : "featured";
  const backendSort =
    SORT_OPTIONS.find(([key]) => key === selectedSort)?.[2] ?? "newest";
  const [{ products, total }, categories] = await Promise.all([
    getProducts({
      page: 1,
      pageSize: 48,
      categorySlug,
      query: query || undefined,
      sort: backendSort,
    }),
    getCategories(),
  ]);

  const href = (cat: string, sort = selectedSort) => {
    const search = new URLSearchParams();
    if (cat !== "all") search.set("cat", cat);
    if (query) search.set("q", query);
    if (sort !== "featured") search.set("sort", sort);
    const value = search.toString();
    return value ? `/shop?${value}` : "/shop";
  };

  return (
    <>
      <section className="shop-hd ht" aria-labelledby="shop-title">
        <div className="wrap">
          <span className="mono gold">
            {query ? `Results for “${query}”` : "The full programme"}
          </span>
          <h1 id="shop-title" className="h-lg">
            Shop <span className="yel-l">all.</span>
          </h1>
        </div>
        <Marquee
          className="mini-mq mono"
          seconds={30}
          items={[
            "Free shipping above ₹999",
            "Code FIRSTSHOW10",
            "7-day easy exchange",
            "Studio printed in India",
          ]}
        />
      </section>
      <section className="sec tight" aria-labelledby="shop-results-title">
        <div className="wrap">
          <div className="toolbar">
            <nav className="chips" aria-label="Product categories">
              <Link
                href={href("all")}
                className={!categorySlug ? "chip on" : "chip"}
              >
                All
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={href(category.slug)}
                  className={
                    categorySlug === category.slug ? "chip on" : "chip"
                  }
                >
                  {category.name}
                </Link>
              ))}
            </nav>
            <nav className="sorts mono" aria-label="Sort products">
              {SORT_OPTIONS.map(([key, label]) => (
                <Link
                  key={key}
                  href={href(categorySlug ?? "all", key)}
                  className={selectedSort === key ? "on" : ""}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <h2 id="shop-results-title" className="sr">
            Products
          </h2>
          <p className="muted small">
            {total} {total === 1 ? "item" : "items"}
          </p>
          {products.length ? (
            <div className="pgrid">
              {products.map((product) => (
                <CatalogProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="empty-s">
              <h2>No shows found</h2>
              <p>
                No products match “{query || categorySlug}”. Try another search
                or category.
              </p>
              <Link className="btn" href="/shop">
                Clear filters
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
