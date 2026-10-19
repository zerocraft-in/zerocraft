"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CatalogCategory, CatalogProduct } from "@/lib/commerce/catalog";
import { formatCatalogPrice } from "@/lib/commerce/format";

type SortMode = "newest" | "low" | "high" | "title";

export default function ZeroPopShop() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<SortMode>("newest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      pageSize: "48",
      sort: sort === "low" ? "price-asc" : sort === "high" ? "price-desc" : sort,
    });
    if (query.trim()) params.set("query", query.trim());
    if (category !== "all") params.set("category", category);

    fetch(`/api/store/catalog?${params}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        setProducts(payload?.products?.products ?? []);
        setCategories(payload?.categories ?? []);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [category, query, sort]);

  const categoryLabel = useMemo(
    () => categories.find((item) => item.slug === category)?.name ?? "All drops",
    [categories, category],
  );

  return (
    <section className="zeropop-shop-page">
      <div className="zeropop-shop-toolbar">
        <div className="zeropop-shop-search">
          <label htmlFor="zeropop-shop-search">Search the drop</label>
          <input id="zeropop-shop-search" value={query} onChange={(event) => { setLoading(true); setQuery(event.target.value); }} placeholder="Tees, posters, frames..." />
        </div>
        <label className="zeropop-shop-sort">Sort by
          <select value={sort} onChange={(event) => { setLoading(true); setSort(event.target.value as SortMode); }}>
            <option value="newest">Featured</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
            <option value="title">Name: A–Z</option>
          </select>
        </label>
      </div>

      <div className="zeropop-shop-categories" aria-label="Product categories">
        <button type="button" className={category === "all" ? "active" : ""} onClick={() => { setLoading(true); setCategory("all"); }}>All</button>
        {categories.map((item) => <button type="button" className={category === item.slug ? "active" : ""} onClick={() => { setLoading(true); setCategory(item.slug); }} key={item.slug}>{item.name}</button>)}
      </div>

      <div className="zeropop-shop-meta"><span>{loading ? "Loading the edit..." : `${products.length} pieces / ${categoryLabel}`}</span><span>Original artwork · © ZEROPOP</span></div>

      {loading ? <div className="zeropop-shop-empty">Loading the first-show edit...</div> : products.length === 0 ? <div className="zeropop-shop-empty"><strong>No scene matches.</strong><span>Try another search or browse the full drop.</span><button type="button" onClick={() => { setQuery(""); setCategory("all"); }}>Reset filters →</button></div> : <div className="zeropop-shop-grid">{products.map((product) => <article className="zeropop-product-card" key={product.id}><Link href={`/store/product/${product.id}`} className="zeropop-product-art"><Image src={product.images[0]} alt={product.title} fill sizes="(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 25vw" unoptimized /><span>{product.isNew ? "NEW" : product.category}</span></Link><div className="zeropop-product-info"><p>{product.subcategory || product.category}</p><h2>{product.title}</h2><div><strong>{formatCatalogPrice(product.price, product.currency)}</strong>{product.isSale && <del>{formatCatalogPrice(product.originalPrice, product.currency)}</del>}</div></div></article>)}</div>}
    </section>
  );
}
