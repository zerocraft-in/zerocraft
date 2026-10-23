"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import ProductCard from "./ProductCard";
import { useStore } from "@/lib/store";

interface Init { cat?: string; lang?: string; q?: string; focus?: boolean }

export default function Shop({ init, step = 8 }: { init: Init; step?: number }) {
  const { wish, catalog: products } = useStore();
  const pathname = usePathname();
  const categories = [...new Set(products.map((product) => product.c))];
  const [cat, setCat] = useState(init.cat || "All");
  const [lang, setLang] = useState(init.lang || "");
  const [q, setQ] = useState(init.q || "");
  const [sort, setSort] = useState("f");
  const [lim, setLim] = useState(step);
  useEffect(() => {
    const params = new URLSearchParams();
    if (cat !== "All") params.set("cat", cat);
    if (lang) params.set("lang", lang);
    if (q.trim()) params.set("q", q.trim());
    window.history.replaceState(null, "", `${pathname}${params.size ? `?${params.toString()}` : ""}`);
  }, [cat, lang, q, pathname]);

  const list = useMemo(() => {
    const l = products.filter((p) =>
      (cat === "All" || (cat === "Wishlist" ? wish.includes(p.id) : p.c === cat)) &&
      (!lang || p.l === lang || !p.l) &&
      (p.n + p.sub + p.c).toLowerCase().includes(q.toLowerCase()));
    if (sort === "l") l.sort((a, b) => a.pr - b.pr);
    if (sort === "h") l.sort((a, b) => b.pr - a.pr);
    return l;
  }, [cat, lang, products, q, sort, wish]);

  const reset = () => setLim(step);
  return (
    <>
      <div className="shop-toolbar storefront-mono">
        {["All", ...categories].map((c) => <button key={c} className={"shop-filter" + (c === cat ? " is-active" : "")} onClick={() => { setCat(c); reset(); }}>{c}</button>)}
      </div>
      <div className="shop-toolbar storefront-mono">
        {[["", "All languages"], ["ta", "Tamil"], ["ml", "Malayalam"]].map(([k, label]) => <button key={k} className={"shop-filter shop-filter--language" + (lang === k ? " is-active" : "")} onClick={() => { setLang(k); reset(); }}>{label}</button>)}
        <input className="shop-search" autoFocus={init.focus} value={q} onChange={(e) => { setQ(e.target.value); reset(); }} placeholder="Search tees, posters, typography…" aria-label="Search products" />
        {q && <button type="button" className="shop-search-clear" onClick={() => { setQ(""); reset(); }}>Clear</button>}
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products">
          <option value="f">Featured</option><option value="l">Price: low to high</option><option value="h">Price: high to low</option>
        </select>
      </div>
      <div className="shop-results storefront-mono">Showing {Math.min(lim, list.length)} of {list.length} designs</div>
      <div className="product-grid">{list.slice(0, lim).map((p) => <ProductCard key={p.id} p={p} />)}</div>
      {list.length === 0 && <p style={{ padding: "40px 0", color: "var(--mute)" }}>{cat === "Wishlist" ? "Nothing saved yet. Tap ♡ on pieces you love." : "No designs match. Try another search or filter."}</p>}
      {list.length > lim && <div className="shop-load-more"><button className="storefront-button storefront-button--secondary" onClick={() => setLim(lim + step)}>Load more designs</button></div>}
    </>
  );
}
