"use client";

import { useEffect, useMemo, useState } from "react";
import ProductCard from "@/components/store/ProductCard";
import type { CatalogCategory, CatalogProduct } from "@/lib/commerce/catalog";
import { trackStoreEvent } from "@/lib/commerce/store-events";

type OriginFilter = "all" | CatalogProduct["designOrigin"];

export default function CatalogShop() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState("all");
  const [subcategory, setSubcategory] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [origin, setOrigin] = useState<OriginFilter>("all");
  const [availability, setAvailability] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({
      pageSize: "48",
      sort: sort === "low" ? "price-asc" : sort === "high" ? "price-desc" : sort,
    });
    if (category !== "all") params.set("category", category);
    if (subcategory !== "all") params.set("subcategory", subcategory);
    if (query.trim()) params.set("query", query.trim());
    if (origin !== "all") params.set("origin", origin);
    if (availability !== "all") params.set("availability", availability);

    const loadCatalog = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/store/catalog?${params}`);
        const payload = await response.json();
        setProducts(payload.products?.products || []);
        setTotal(payload.products?.total || 0);
        setCategories(payload.categories || []);
      } catch {
        setProducts([]);
        setTotal(0);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    void loadCatalog();
  }, [availability, category, origin, query, sort, subcategory]);

  const activeCategory = categories.find((item) => item.slug === category);
  const visibleSubcategories = useMemo(() => activeCategory?.subcategories || [], [activeCategory]);
  const clearFilters = () => {
    setCategory("all");
    setSubcategory("all");
    setQuery("");
    setOrigin("all");
    setAvailability("all");
    setSort("newest");
  };

  return (
    <main className="min-h-screen bg-transparent text-[#151515]">
      <section className="mx-auto max-w-7xl px-5 pb-8 pt-12 sm:px-8 lg:px-14 lg:pt-20">
        <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#e34d2e]">02 / Zerocraft Store — The current edit</p>
        <h1 className="mt-4 font-secondary text-6xl font-black leading-[.88] tracking-[-.07em] sm:text-8xl">Find your <span className="text-[#e34d2e]">scene.</span></h1>
        <p className="mt-5 max-w-xl text-sm leading-6 text-black/60">Original prints, wearable graphics, considered frames and small objects for people who collect a feeling.</p>
        <div className="mt-7 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-[.14em] text-black/45"><span className="rounded-full border border-black/15 bg-white/55 px-3 py-2">Made in Tenkasi</span><span className="rounded-full border border-black/15 bg-white/55 px-3 py-2">Small-batch drops</span><span className="rounded-full border border-black/15 bg-white/55 px-3 py-2">India-wide delivery</span></div>
      </section>

      <section id="categories" className="border-y border-black/15 bg-transparent px-5 py-5 sm:px-8 lg:px-14">
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="sr-only" htmlFor="catalog-search">Search the catalog</label>
            <div className="relative w-full lg:max-w-md">
              <input id="catalog-search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") trackStoreEvent("search", { query: query.trim() }); }} placeholder="Search products, materials or scenes" className="w-full rounded-[8px] border border-black/20 bg-transparent px-4 py-3 text-sm outline-none transition-colors placeholder:text-black/40 focus:border-[#e34d2e] focus:ring-1 focus:ring-[#e34d2e]/30" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-[.14em] text-black/35">Search</span>
            </div>
            <div className="flex gap-2 overflow-x-auto" aria-label="Product categories">
              {["all", ...categories.map((item) => item.slug)].map((item) => <button key={item} type="button" onClick={() => { setCategory(item); setSubcategory("all"); trackStoreEvent("filter_apply", { filter: "category", value: item }); }} className={`whitespace-nowrap rounded-[8px] border px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${category === item ? "border-[#151311] bg-[#151311] text-white" : "border-black/20 bg-transparent text-black/60 hover:border-[#e34d2e] hover:text-[#e34d2e]"}`}>{item === "all" ? "All" : categories.find((cat) => cat.slug === item)?.name || item}</button>)}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-black/10 pt-4 sm:flex-row sm:flex-wrap sm:items-center">
            {visibleSubcategories.length > 0 && <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Product subcategories">{["all", ...visibleSubcategories.map((item) => item.slug)].map((item) => <button key={item} type="button" onClick={() => { setSubcategory(item); trackStoreEvent("filter_apply", { filter: "subcategory", value: item }); }} className={`whitespace-nowrap rounded-[6px] border px-3 py-1.5 text-[10px] font-bold transition-all ${subcategory === item ? "border-[#e34d2e] bg-[#e34d2e] text-white" : "border-black/15 bg-transparent text-black/55 hover:border-[#e34d2e] hover:text-[#e34d2e]"}`}>{item === "all" ? "All subcategories" : visibleSubcategories.find((sub) => sub.slug === item)?.name}</button>)}</div>}
            <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.14em] text-black/40">Origin<select aria-label="Design origin" value={origin} onChange={(event) => { setOrigin(event.target.value as OriginFilter); trackStoreEvent("filter_apply", { filter: "origin", value: event.target.value }); }} className="rounded-[8px] border border-black/20 bg-transparent px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-[#151311] outline-none transition-colors hover:border-[#e34d2e] focus:border-[#e34d2e]">
              <option value="all">All design origins</option>
              <option value="original_zerocraft">Zerocraft originals</option>
              <option value="licensed">Licensed work</option>
              <option value="fan_inspired">Fan-inspired</option>
            </select></label>
            <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.14em] text-black/40">Stock<select aria-label="Availability" value={availability} onChange={(event) => { setAvailability(event.target.value); trackStoreEvent("filter_apply", { filter: "availability", value: event.target.value }); }} className="rounded-[8px] border border-black/20 bg-transparent px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-[#151311] outline-none transition-colors hover:border-[#e34d2e] focus:border-[#e34d2e]">
              <option value="all">All availability</option>
              <option value="in-stock">In stock</option>
            </select></label>
            <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.14em] text-black/40 sm:ml-auto">Sort by<select aria-label="Sort products" value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-[8px] border border-black/20 bg-[#151311] px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-white outline-none transition-colors hover:border-[#e34d2e] focus:border-[#e34d2e]">
              <option value="newest">New arrivals</option>
              <option value="low">Price: low</option>
              <option value="high">Price: high</option>
              <option value="title">Name: A–Z</option>
            </select></label>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-14">
        <div className="mb-5 flex items-center justify-between gap-4 text-[10px] font-black uppercase tracking-[.16em] text-black/45"><span>{loading ? "Loading the edit" : `${total} ${total === 1 ? "piece" : "pieces"}`}</span>{(category !== "all" || subcategory !== "all" || query || origin !== "all" || availability !== "all") && <button type="button" onClick={clearFilters} className="text-[#e34d2e] hover:underline">Clear filters</button>}</div>
        {loading ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="col-span-full rounded-3xl border border-black/10 bg-white p-16 text-center text-sm text-black/50">Loading the catalog…</div></div> : products.length ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">{products.map((product, index) => <ProductCard key={product.id} product={product} priority={index === 0} />)}</div> : <div className="rounded-3xl border border-black/10 bg-white p-16 text-center"><p className="text-xl font-black">Nothing matches this edit.</p><p className="mt-2 text-sm text-black/55">Try another scene, remove a filter or search by product name.</p><button type="button" onClick={clearFilters} className="mt-5 rounded-full bg-black px-5 py-3 text-[10px] font-black uppercase tracking-wider text-white">Show the full edit</button></div>}
      </section>
    </main>
  );
}
