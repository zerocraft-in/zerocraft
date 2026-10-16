"use client";

import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/store/Breadcrumbs";
import ProductCard from "@/components/store/ProductCard";
import type { CatalogProduct } from "@/lib/commerce/catalog";
import { IconSearch, IconX } from "@tabler/icons-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CatalogProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: "1", pageSize: "48", sort: "newest" });
    if (query.trim()) params.set("query", query.trim());
    const loadingTimer = window.setTimeout(() => {
      setIsLoading(true);
      setError(null);
    }, 0);
    fetch(`/api/store/catalog?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Search unavailable");
        setSearchResults(payload.products?.products ?? []);
        setTotal(payload.products?.total ?? 0);
      })
      .catch((reason) => {
        if (reason.name !== "AbortError") setError(reason.message || "Search unavailable");
      })
      .finally(() => setIsLoading(false));
    return () => {
      window.clearTimeout(loadingTimer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="py-8 min-h-screen">
      <div className="container-site">
        <Breadcrumbs items={[{ label: "Search" }]} />

        <div className="max-w-2xl my-8">
          <span className="text-label text-lime-600 dark:text-lime-400 mb-2 block">
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
              className="w-full pl-12 pr-10 py-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-base text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-lime-400 shadow-sm"
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
              {query.trim() === "" ? `Showing ${total} published products` : `Found ${total} results for "${query}"`}
            </span>
          </div>

          {isLoading ? (
            <div className="p-16 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"><p className="text-sm text-neutral-500">Searching the catalog...</p></div>
          ) : error ? (
            <div className="p-16 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-rose-200 dark:border-rose-900/50"><p className="text-sm text-rose-600 dark:text-rose-300">{error}</p></div>
          ) : searchResults.length === 0 ? (
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
