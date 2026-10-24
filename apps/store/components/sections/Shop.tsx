"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Drawer } from "@base-ui/react/drawer";
import ProductCard from "./ProductCard";
import { useStore } from "@/lib/store";

interface Init { cat?: string; lang?: string; q?: string; focus?: boolean }

export default function Shop({ init, step = 8 }: { init: Init; step?: number }) {
  const { catalog: products } = useStore();
  const pathname = usePathname();
  const categories = [...new Set(products.map((product) => product.c))];
  const [cat, setCat] = useState(init.cat || "All");
  const [lang, setLang] = useState(init.lang || "");
  const [q, setQ] = useState(init.q || "");
  const [sort, setSort] = useState("f");
  const [lim, setLim] = useState(step);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [snapPoint, setSnapPoint] = useState<Drawer.Root.Props["snapPoint"]>(1);
  useEffect(() => {
    const params = new URLSearchParams();
    if (cat !== "All") params.set("cat", cat);
    if (lang) params.set("lang", lang);
    if (q.trim()) params.set("q", q.trim());
    window.history.replaceState(null, "", `${pathname}${params.size ? `?${params.toString()}` : ""}`);
  }, [cat, lang, q, pathname]);

  const list = useMemo(() => {
    const l = products.filter((p) =>
      (cat === "All" || p.c === cat) &&
      (!lang || p.l === lang || !p.l) &&
      (p.n + p.sub + p.c).toLowerCase().includes(q.toLowerCase()));
    if (sort === "l") l.sort((a, b) => a.pr - b.pr);
    if (sort === "h") l.sort((a, b) => b.pr - a.pr);
    if (sort === "r") l.sort((a, b) => b.r - a.r);
    return l;
  }, [cat, lang, products, q, sort]);

  const reset = () => setLim(step);
  const clearFilters = () => {
    setCat("All");
    setLang("");
    reset();
  };
  const renderFilters = (prefix: string) => (
    <>
      <section className="shop-sidebar__section" aria-labelledby={`${prefix}-categories`}>
        <h2 id={`${prefix}-categories`} className="shop-sidebar__heading">
          <span>01</span> Category
        </h2>
        <div className="shop-sidebar__options">
          {["All", ...categories].map((category) => (
            <button
              key={category}
              type="button"
              className={"shop-sidebar__option" + (category === cat ? " is-active" : "")}
              aria-pressed={category === cat}
              onClick={() => {
                setCat(category);
                reset();
              }}
            >
              <span>{category === "All" ? "All designs" : category}</span>
              <span className="shop-sidebar__indicator" aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
      <section className="shop-sidebar__section" aria-labelledby={`${prefix}-language`}>
        <h2 id={`${prefix}-language`} className="shop-sidebar__heading">
          <span>02</span> Language
        </h2>
        <div className="shop-sidebar__languages">
          {[["", "All"], ["ta", "Tamil"], ["ml", "Malayalam"]].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={"shop-sidebar__language" + (lang === key ? " is-active" : "")}
              aria-pressed={lang === key}
              onClick={() => {
                setLang(key);
                reset();
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
    </>
  );

  const renderSort = () => (
    <label className="shop-sort">
      <span>Sort transmission</span>
      <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products">
        <option value="f">Featured</option>
        <option value="r">Highest rated</option>
        <option value="l">Price: low to high</option>
        <option value="h">Price: high to low</option>
      </select>
    </label>
  );

  return (
    <Drawer.Root
      open={filtersOpen}
      onOpenChange={setFiltersOpen}
      snapPoints={[0.56, 1]}
      snapPoint={snapPoint}
      onSnapPointChange={(point) => setSnapPoint(point)}
      swipeDirection="down"
      snapToSequentialPoints
    >
      <div className="shop-layout">
        <aside className="shop-sidebar" aria-label="Product filters">
          <div className="shop-sidebar__top">
            <span className="storefront-mono">Tune the signal</span>
            {(cat !== "All" || lang) && (
              <button type="button" className="shop-sidebar__reset" onClick={clearFilters}>
                Reset
              </button>
            )}
          </div>
          {renderFilters("shop-sidebar")}
        </aside>
        <div className="shop-results-area">
          <div className="shop-toolbar shop-toolbar--controls">
            <label className="shop-search-wrap">
              <span className="shop-search-wrap__icon" aria-hidden="true">⌕</span>
              <input
                className="shop-search"
                autoFocus={init.focus}
                value={q}
                onChange={(event) => {
                  setQ(event.target.value);
                  reset();
                }}
                placeholder="Search the catalog"
                aria-label="Search products"
              />
              {q && (
                <button
                  type="button"
                  className="shop-search-clear"
                  onClick={() => {
                    setQ("");
                    reset();
                  }}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </label>
            <Drawer.Trigger
              className="shop-mobile-filter-trigger"
              aria-haspopup="dialog"
              aria-expanded={filtersOpen}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M4 7h16M7 12h10m-7 5h4" />
              </svg>
              Filters &amp; sort
              {(cat !== "All" || lang) && (
                <span className="shop-mobile-filter-count">
                  {Number(cat !== "All") + Number(Boolean(lang))}
                </span>
              )}
            </Drawer.Trigger>
            <div className="shop-desktop-sort">{renderSort()}</div>
          </div>
          <div className="shop-results storefront-mono" role="status" aria-live="polite">
            <span>Showing {Math.min(lim, list.length)} of {list.length} designs</span>
            {(cat !== "All" || lang) && (
              <button type="button" onClick={clearFilters}>Clear filters ×</button>
            )}
          </div>
          <div className="product-grid">
            {list.slice(0, lim).map((product) => <ProductCard key={product.id} p={product} />)}
          </div>
          {list.length === 0 && (
            <p className="shop-empty">No designs on this frequency. Try another search or filter.</p>
          )}
          {list.length > lim && (
            <div className="shop-load-more">
              <button className="storefront-button storefront-button--secondary" onClick={() => setLim(lim + step)}>
                Load more designs
              </button>
            </div>
          )}
        </div>
      </div>
      <Drawer.Portal>
        <Drawer.Backdrop className="shop-drawer-backdrop" />
        <Drawer.Viewport className="shop-drawer-viewport" data-modal="true">
          <Drawer.Popup className="shop-drawer-popup" data-swipe-axis="y" data-snap-points="">
            <div className="shop-drawer-swipe-handle" aria-hidden="true">
              <span />
            </div>
            <Drawer.Content className="shop-drawer" aria-labelledby="shop-drawer-title">
              <div className="shop-drawer__header">
                <div>
                  <span className="storefront-mono">Signal controls / 01</span>
                  <h2 id="shop-drawer-title" className="storefront-display">Filter drop</h2>
                </div>
                <Drawer.Close
                  className="shop-drawer__close"
                  aria-label="Close filters and sorting"
                >
                  ×
                </Drawer.Close>
              </div>
              <div className="shop-drawer__body">
                {renderFilters("shop-drawer")}
                {renderSort()}
              </div>
              <div className="shop-drawer__footer">
                <button type="button" className="shop-drawer__clear" onClick={clearFilters}>
                  Clear filters
                </button>
                <Drawer.Close className="shop-drawer__apply">
                  Show {list.length} designs
                </Drawer.Close>
              </div>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
