"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { IconAdjustmentsHorizontal, IconArrowUpRight, IconLayoutGrid, IconList, IconLoader2, IconSearch, IconX } from "@/components/store/StoreIcon";
import ProductCard from "@/components/store/ProductCard";
import type { CatalogCategory, CatalogProduct } from "@/lib/commerce/catalog";

gsap.registerPlugin(ScrollTrigger);
const PAGE_SIZE = 12;

export default function PosterizedShop() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const initialQuery = params.get("query") || "";
  const initialMaxPrice = Number(params.get("maxPrice") || 5000);
  const initialVariantFilters = Object.fromEntries(Array.from(params.entries()).filter(([key, value]) => key.startsWith("variant_") && value).map(([key, value]) => [key.slice("variant_".length), value]));
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(params.get("category") || "all");
  const [sort, setSort] = useState(params.get("sort") || "newest");
  const [maxPrice, setMaxPrice] = useState(Number.isFinite(initialMaxPrice) ? initialMaxPrice : 5000);
  const [variantFilters, setVariantFilters] = useState<Record<string, string>>(initialVariantFilters);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [mobileFilters, setMobileFilters] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (category !== "all") next.set("category", category);
    if (query) next.set("query", query);
    if (sort !== "newest") next.set("sort", sort);
    if (maxPrice < 5000) next.set("maxPrice", String(maxPrice));
    Object.entries(variantFilters).forEach(([key, value]) => { if (value) next.set(`variant_${key}`, value); });
    const queryString = next.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }, [category, maxPrice, pathname, query, router, sort, variantFilters]);

  const requestUrl = useCallback((nextPage: number) => {
    const request = new URLSearchParams({ page: String(nextPage), pageSize: String(PAGE_SIZE), sort: sort === "low" ? "price-asc" : sort === "high" ? "price-desc" : "newest" });
    if (query) request.set("query", query);
    if (category !== "all") request.set("category", category);
    return `/api/store/catalog?${request.toString()}`;
  }, [category, query, sort]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => setLoading(true), 0);
    fetch(requestUrl(1), { signal: controller.signal }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Catalog unavailable");
      const firstPage = payload.products?.products || [];
      setProducts(firstPage);
      setTotal(payload.products?.total || 0);
      setCategories(payload.categories || []);
      setPage(1);
      setHasMore(firstPage.length < (payload.products?.total || 0));
      setError("");
    }).catch((reason) => { if (reason.name !== "AbortError") setError(reason.message || "Catalog unavailable"); }).finally(() => setLoading(false));
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [requestUrl]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await fetch(requestUrl(nextPage));
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "More products could not be loaded.");
      const nextProducts = payload.products?.products || [];
      setProducts((current) => [...current, ...nextProducts]);
      setPage(nextPage);
      setTotal(payload.products?.total || total);
      setHasMore(products.length + nextProducts.length < (payload.products?.total || total));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "More products could not be loaded.");
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loading, loadingMore, page, products.length, requestUrl, total]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) void loadMore(); }, { rootMargin: "700px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  useLayoutEffect(() => {
    const context = gsap.context(() => {
      gsap.fromTo(".shop-card-reveal", { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.045, duration: 0.55, ease: "power3.out", scrollTrigger: { trigger: listRef.current, start: "top 88%", once: true } });
    }, listRef);
    return () => context.revert();
  }, [products.length, view]);

  const visible = products.filter((product) => product.price <= maxPrice);
  const variantOptions = Object.entries(products.reduce<Record<string, string[]>>((result, product) => { product.variants.forEach((variant) => Object.entries(variant.options).forEach(([key, value]) => { result[key] = Array.from(new Set([...(result[key] || []), value])); })); return result; }, {}));
  const variantVisible = visible.filter((product) => Object.entries(variantFilters).every(([key, value]) => product.variants.some((variant) => variant.options[key] === value)));
  const clearFilters = () => { setCategory("all"); setSearchInput(""); setMaxPrice(5000); setSort("newest"); setVariantFilters({}); };
  const toggleVariant = (key: string, value: string) => setVariantFilters((current) => { const next = { ...current }; if (next[key] === value) delete next[key]; else next[key] = value; return next; });
  const filterPanel = <div className="grid gap-7"><div><p className="mb-3 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-[#151515]/45"><span>Categories</span><span>{total}</span></p><div className="grid gap-1">{["all", ...categories.map((item) => item.slug)].map((item) => <button key={item} onClick={() => { setCategory(item); setMobileFilters(false); }} className={`flex justify-between rounded-xl px-3 py-2.5 text-left text-[11px] font-bold transition-all ${category === item ? "bg-[#171717] text-white shadow-sm" : "text-[#151515]/60 hover:bg-[#f3f0e8] hover:text-[#151515]"}`}><span>{item === "all" ? "All products" : categories.find((cat) => cat.slug === item)?.name || item}</span></button>)}</div></div>{variantOptions.length > 0 && <div className="border-t border-[#151515]/10 pt-6"><p className="mb-4 text-[10px] font-black uppercase tracking-[0.16em] text-[#151515]/45">Variants</p><div className="grid gap-5">{variantOptions.map(([key, values]) => <div key={key}><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">{key}</p><div className="flex flex-wrap gap-1.5">{values.map((value) => <button key={value} onClick={() => toggleVariant(key, value)} className={`rounded-full border px-2.5 py-1.5 text-[10px] font-bold transition-colors ${variantFilters[key] === value ? "border-[#e34d2e] bg-[#e34d2e] text-white" : "border-[#151515]/15 text-[#151515]/55 hover:border-[#e34d2e] hover:text-[#e34d2e]"}`}>{value}</button>)}</div></div>)}</div></div>}<div className="border-t border-[#151515]/10 pt-6"><div className="mb-2 flex justify-between text-[10px] font-black uppercase tracking-wider"><span>Max price</span><span>₹{maxPrice.toLocaleString("en-IN")}</span></div><input type="range" min="200" max="5000" step="5" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} className="w-full accent-[#e34d2e]" /><div className="mt-1 flex justify-between text-[10px] text-[#151515]/45"><span>₹200</span><span>₹5,000</span></div></div><button onClick={clearFilters} className="rounded-full border border-[#151515]/15 py-3 text-[10px] font-black uppercase tracking-wider transition-colors hover:bg-[#171717] hover:text-white">Reset filters</button></div>;

  return <div className="min-h-screen overflow-hidden bg-[#f8f7f3] text-[#151515]">
    <section className="mx-auto max-w-[1440px] px-5 pb-10 pt-12 sm:px-8 sm:pb-14 lg:px-14 lg:pb-16 lg:pt-20"><div className="flex flex-wrap items-end justify-between gap-8"><div><p className="mb-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#e34d2e]">Posterized / Shop all</p><h1 className="max-w-3xl text-5xl font-black leading-[0.88] tracking-[-0.07em] sm:text-8xl">Good walls<br /><span className="text-[#e34d2e]">start here.</span></h1></div><p className="max-w-sm text-sm leading-6 text-[#151515]/60">Posterized prints, custom wall sets, and wearable drops made for rooms with a point of view.</p></div><div className="mt-10 flex gap-2 overflow-x-auto pb-2">{["all", ...categories.map((item) => item.slug)].map((item) => <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-colors ${category === item ? "border-[#171717] bg-[#171717] text-white" : "border-[#151515]/15 bg-white/50 text-[#151515]/60 hover:border-[#e34d2e] hover:text-[#e34d2e]"}`}>{item === "all" ? "All products" : categories.find((cat) => cat.slug === item)?.name || item}</button>)}</div></section>
    <section className="border-y border-[#151515]/10 bg-white/70 px-5 py-5 sm:px-8 lg:px-14"><div className="mx-auto flex max-w-[1440px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="relative w-full max-w-xl"><IconSearch size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#151515]/35" /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search posters, tees, collections..." className="w-full rounded-full border border-[#151515]/15 bg-white py-3 pl-11 pr-10 text-sm outline-none transition-colors focus:border-[#e34d2e]" />{searchInput && <button onClick={() => setSearchInput("")} className="absolute right-4 top-1/2 -translate-y-1/2"><IconX size={16} /></button>}</div><div className="flex items-center justify-between gap-2 sm:gap-3"><button onClick={() => setMobileFilters(true)} className="flex items-center gap-2 rounded-full border border-[#151515]/15 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-wider lg:hidden"><IconAdjustmentsHorizontal size={15} /> Filters</button><span className="hidden text-[10px] font-bold uppercase tracking-wider text-[#151515]/45 sm:inline">{visible.length} loaded / {total} products</span><select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-full border border-[#151515]/15 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-wider outline-none"><option value="newest">New arrivals</option><option value="low">Price: low</option><option value="high">Price: high</option></select><div className="hidden rounded-full border border-[#151515]/10 bg-white p-1 sm:flex"><button onClick={() => setView("grid")} className={`rounded-full p-2 ${view === "grid" ? "bg-[#171717] text-white" : "text-[#151515]/45"}`}><IconLayoutGrid size={15} /></button><button onClick={() => setView("list")} className={`rounded-full p-2 ${view === "list" ? "bg-[#171717] text-white" : "text-[#151515]/45"}`}><IconList size={15} /></button></div></div></div></section>
    <section className="mx-auto grid max-w-[1440px] gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[240px_1fr] lg:px-14 lg:py-16"><aside className="sticky top-28 hidden h-fit rounded-[1.75rem] border border-[#151515]/10 bg-white p-5 shadow-[0_12px_32px_rgba(20,20,20,.05)] lg:block"><div className="mb-6 flex items-center justify-between border-b border-[#151515]/10 pb-5 text-[10px] font-black uppercase tracking-[0.16em]"><span className="flex items-center gap-2"><IconAdjustmentsHorizontal size={15} /> Refine edit</span><span className="rounded-full bg-[#f3f0e8] px-2 py-1 text-[9px] text-[#151515]/50">Live</span></div>{filterPanel}</aside><div><div className="mb-5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#151515]/45 sm:hidden"><span>{variantVisible.length} loaded / {total} products</span><span>{hasMore ? "Scroll to load more" : "End of edit"}</span></div>{loading ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl bg-[#e8e4dc]" />)}</div> : error && !products.length ? <div className="rounded-3xl border border-red-200 bg-red-50 p-20 text-center text-sm text-red-600">{error}</div> : variantVisible.length === 0 ? <div className="rounded-3xl border border-[#151515]/10 bg-white p-20 text-center"><p className="text-xl font-black">Nothing in this edit yet.</p><button onClick={clearFilters} className="mt-5 rounded-full bg-[#171717] px-5 py-3 text-xs font-black uppercase tracking-wider text-white">Show everything</button></div> : <div ref={listRef} className={view === "grid" ? "grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5" : "grid gap-5"}>{variantVisible.map((product) => <div className="shop-card-reveal" key={product.id}><ProductCard product={product} /></div>)}</div>}<div ref={sentinelRef} className="flex min-h-24 items-center justify-center py-8">{loadingMore ? <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#151515]/45"><IconLoader2 size={16} className="animate-spin" /> Loading more products</span> : hasMore && !loading ? <span className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/35">Keep scrolling for more</span> : !loading && products.length > 0 ? <span className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/35">You&apos;re at the end of the edit</span> : null}</div><div className="mt-5 rounded-3xl bg-[#ffb703] p-6 sm:flex sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em]">Have your own idea?</p><p className="mt-1 text-2xl font-black tracking-tight">Design a custom product.</p></div><Link href="/store/shop?category=customized-gifts" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#171717] px-5 py-3 text-[10px] font-black uppercase tracking-wider text-white sm:mt-0">Start designing <IconArrowUpRight size={15} /></Link></div></div></section>
    <AnimatePresence>{mobileFilters && <><motion.button aria-label="Close filters" onClick={() => setMobileFilters(false)} className="fixed inset-0 z-[210] bg-black/30 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.aside className="fixed inset-x-0 bottom-0 z-[220] rounded-t-[2rem] bg-white p-6 shadow-2xl lg:hidden" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }}><div className="mb-6 flex items-center justify-between"><h2 className="text-lg font-black">Refine the edit</h2><button onClick={() => setMobileFilters(false)} className="rounded-full bg-[#f3f0e8] p-2"><IconX size={18} /></button></div>{filterPanel}</motion.aside></>}</AnimatePresence>
  </div>;
}
