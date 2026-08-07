"use client";

import { useState } from "react";
import Breadcrumbs from "@/components/store/Breadcrumbs";
import ProductCard from "@/components/store/ProductCard";
import { PRODUCTS } from "@/lib/data/storeData";
import { IconSearch, IconX } from "@tabler/icons-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");

  const searchResults = query.trim() === ""
    ? PRODUCTS
    : PRODUCTS.filter((p) =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.shortDescription.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase()) ||
        p.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      );

  return (
    <div className="py-8 min-h-screen">
      <div className="container-site">
        <Breadcrumbs items={[{ label: "Search" }]} />

        <div className="max-w-2xl my-8">
          <span className="text-label text-amber-600 dark:text-amber-400 mb-2 block">
            Instant Search
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white mb-6">
            Find Your Next Favorite Piece
          </h1>

          <div className="relative">
            <IconSearch size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, material, category, tag..."
              className="w-full pl-12 pr-10 py-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-base text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-amber-400 shadow-sm"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                <IconX size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="my-8">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800 mb-8">
            <span className="text-xs font-mono text-neutral-400">
              {query.trim() === "" ? "Showing all products" : `Found ${searchResults.length} results for "${query}"`}
            </span>
          </div>

          {searchResults.length === 0 ? (
            <div className="p-16 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <p className="text-base font-semibold mb-2">No matching products found.</p>
              <p className="text-xs text-neutral-400 font-mono">Try searching for &ldquo;poster&rdquo;, &ldquo;frame&rdquo;, &ldquo;leather&rdquo;, or &ldquo;brass&rdquo;.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {searchResults.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
