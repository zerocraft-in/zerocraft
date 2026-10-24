"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Art from "./Art";
import { useStore } from "@/lib/store";

type CategoryGroup = "Wearables" | "Wall art" | "Objects" | "Digital";

const categoryDetails: Record<string, { group: CategoryGroup; intro: string; note: string }> = {
  Tees: {
    group: "Wearables",
    intro: "Big-screen energy. Made for the everyday.",
    note: "Graphic tees",
  },
  Hoodies: {
    group: "Wearables",
    intro: "A little extra warmth. A lot more character.",
    note: "Everyday layers",
  },
  Posters: {
    group: "Wall art",
    intro: "Bring your favorite frames home.",
    note: "Prints & posters",
  },
  Frames: {
    group: "Wall art",
    intro: "Ready-to-hang art for your own little theatre.",
    note: "Framed artwork",
  },
  Accessories: {
    group: "Objects",
    intro: "Small things. Strong main-character energy.",
    note: "Daily favorites",
  },
  Digital: {
    group: "Digital",
    intro: "Instant downloads for your screens and spaces.",
    note: "Digital drops",
  },
};

const groups: Array<"All" | CategoryGroup> = [
  "All",
  "Wearables",
  "Wall art",
  "Objects",
  "Digital",
];

export default function CategoriesCatalog() {
  const { catalog } = useStore();
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<(typeof groups)[number]>("All");

  const categories = useMemo(() => {
    const names = [...new Set(catalog.map((product) => product.c))];
    return names
      .map((name) => {
        const products = catalog.filter((product) => product.c === name);
        const details = categoryDetails[name] ?? {
          group: "Objects" as const,
          intro: `Fresh finds from the ${name.toLowerCase()} collection.`,
          note: "The collection",
        };
        return { name, products, details };
      })
      .filter(({ name, details }) => {
        const matchesGroup = activeGroup === "All" || details.group === activeGroup;
        const matchesQuery = `${name} ${details.intro} ${details.note}`
          .toLowerCase()
          .includes(query.trim().toLowerCase());
        return matchesGroup && matchesQuery;
      })
      .sort((a, b) => {
        const order = ["Tees", "Hoodies", "Posters", "Frames", "Accessories", "Digital"];
        const aIndex = order.indexOf(a.name);
        const bIndex = order.indexOf(b.name);
        return (aIndex < 0 ? order.length : aIndex) - (bIndex < 0 ? order.length : bIndex)
          || a.name.localeCompare(b.name);
      });
  }, [activeGroup, catalog, query]);

  const featuredProduct = catalog[0];
  const totalDesigns = catalog.length;
  const categoryCount = new Set(catalog.map((product) => product.c)).size;
  const renderGroupButtons = () => groups.map((group, index) => (
    <button
      key={group}
      type="button"
      className={activeGroup === group ? "is-active" : ""}
      aria-pressed={activeGroup === group}
      onClick={() => setActiveGroup(group)}
    >
      <span className="category-hub__group-icon" aria-hidden="true">
        {index === 0 ? "✳" : `0${index}`}
      </span>
      <span>{group}</span>
    </button>
  ));

  return (
    <section className="category-hub">
      <div className="storefront-container">
        <header className="category-hub__hero">
          <div className="category-hub__hero-copy">
            <span className="storefront-kicker storefront-mono">
              Zerocraft directory / 01
            </span>
            <h1 className="storefront-display category-hub__title">
              <span className="category-hub__title-desktop">
                Find your
                <br />
                <em>frequency.</em>
              </span>
              <span className="category-hub__title-mobile">Explore categories</span>
            </h1>
            <p>
              Your next favorite starts here. Explore the collections, pick a
              vibe, and find the piece that feels like you.
            </p>
            <div className="category-hub__hero-meta">
              <span><strong>{categoryCount.toString().padStart(2, "0")}</strong> collections</span>
              <span aria-hidden="true">/</span>
              <span><strong>{totalDesigns}</strong> designs to explore</span>
            </div>
          </div>
          <Link className="category-hub__hero-art" href="/shop" aria-label="Explore all products">
            {featuredProduct ? (
              <Art p={featuredProduct} k="c" />
            ) : (
              <span className="category-hub__hero-placeholder">ZC</span>
            )}
            <span className="category-hub__hero-stamp storefront-mono">The whole drop / 2026</span>
            <span className="category-hub__hero-link storefront-mono">
              Explore all designs <span aria-hidden="true">↗</span>
            </span>
          </Link>
        </header>

        <div className="category-hub__browse-layout">
          <aside className="category-hub__sidebar" aria-label="Browse category types">
            <span className="category-hub__sidebar-label storefront-mono">Browse</span>
            <div className="category-hub__sidebar-options" role="group" aria-label="Filter collections">
              {renderGroupButtons()}
            </div>
          </aside>
          <div className="category-hub__main">
            <div className="category-hub__toolbar">
              <label className="category-hub__search">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <circle cx="10.8" cy="10.8" r="6.8" />
                  <path d="m16 16 4.2 4.2" />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find your kind of thing"
                  aria-label="Search categories"
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} aria-label="Clear category search">
                    ×
                  </button>
                )}
              </label>
              <div className="category-hub__filters" role="group" aria-label="Filter collections">
                {renderGroupButtons()}
              </div>
            </div>

            <div className="category-hub__section-heading">
              <div>
                <span className="storefront-kicker storefront-mono">Browse by collection</span>
                <h2 className="storefront-display category-hub__section-title">
                  <span className="category-hub__section-title-desktop">Pick your <em>world.</em></span>
                  <span className="category-hub__section-title-mobile">Shop by category</span>
                </h2>
              </div>
              <span className="category-hub__result-count storefront-mono">
                {categories.length.toString().padStart(2, "0")} collections
              </span>
            </div>

            {categories.length > 0 ? (
              <div className="category-hub__grid">
                {categories.map(({ name, products, details }, index) => {
                  const sample = products[0];
                  return (
                    <Link
                      key={name}
                      href={`/shop?cat=${encodeURIComponent(name)}`}
                      className="category-hub__card"
                    >
                      <div className="category-hub__card-art">
                        {sample && <Art p={sample} k="c" />}
                        <span className="category-hub__card-index storefront-mono">
                          0{index + 1} / {details.note}
                        </span>
                        <span className="category-hub__card-arrow" aria-hidden="true">↗</span>
                      </div>
                      <div className="category-hub__card-info">
                        <div>
                          <span className="category-hub__card-group storefront-mono">{details.group}</span>
                          <h3 className="storefront-display">{name}</h3>
                          <p>{details.intro}</p>
                        </div>
                        <span className="category-hub__card-count storefront-mono">
                          {products.length.toString().padStart(2, "0")} items
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="category-hub__empty">
                <span className="storefront-mono">No signal found</span>
                <p>Try a different search or collection filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setActiveGroup("All");
                  }}
                >
                  Reset browse
                </button>
              </div>
            )}
          </div>
        </div>

        <aside className="category-hub__language-prompt">
          <div>
            <span className="storefront-kicker storefront-mono">Stories in your language</span>
            <h2 className="storefront-display">Tamil. <em>Malayalam.</em> Always original.</h2>
          </div>
          <div className="category-hub__language-links">
            <Link href="/shop?lang=ta">Explore Tamil designs <span aria-hidden="true">↗</span></Link>
            <Link href="/shop?lang=ml">Explore Malayalam designs <span aria-hidden="true">↗</span></Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
