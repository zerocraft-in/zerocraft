"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Breadcrumbs from "@/components/store/Breadcrumbs";
import ProductCard from "@/components/store/ProductCard";
import { PRODUCTS, CATEGORIES } from "@/lib/data/storeData";
import {
  IconSearch,
  IconAdjustmentsHorizontal,
  IconX,
  IconLayoutGrid,
  IconList,
  IconStarFilled,
} from "@tabler/icons-react";

export default function ShopPage() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";
  const initialCollection = searchParams.get("collection") || "all";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedCollection, setSelectedCollection] = useState<string>(initialCollection);
  const [maxPrice, setMaxPrice] = useState<number>(200);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filtering Logic
  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((p) => {
      // Search
      if (
        searchQuery &&
        !p.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.category.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      // Category
      if (selectedCategory !== "all" && p.categorySlug !== selectedCategory) {
        return false;
      }
      // Collection
      if (selectedCollection !== "all" && p.collectionSlug !== selectedCollection) {
        return false;
      }
      // Price
      if (p.price > maxPrice) {
        return false;
      }
      // Stock
      if (inStockOnly && p.stock <= 0) {
        return false;
      }
      // Rating
      if (p.rating < minRating) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      if (sortBy === "popular") return b.reviewCount - a.reviewCount;
      if (sortBy === "rating") return b.rating - a.rating;
      return a.isNew ? -1 : 1; // Default newest
    });
  }, [searchQuery, selectedCategory, selectedCollection, maxPrice, inStockOnly, minRating, sortBy]);

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedCollection("all");
    setMaxPrice(200);
    setInStockOnly(false);
    setMinRating(0);
    setSortBy("newest");
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    selectedCategory !== "all" ||
    selectedCollection !== "all" ||
    maxPrice < 200 ||
    inStockOnly ||
    minRating > 0;

  return (
    <div className="py-8 min-h-screen">
      <div className="container-site">
        <Breadcrumbs items={[{ label: "Shop Catalog" }]} />

        {/* Page Header Banner */}
        <div className="mb-10 pt-4">
          <span className="text-label text-amber-600 dark:text-amber-400 mb-2 block">
            Store Catalog
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white mb-3">
            Handcrafted Luxury Collection
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xl font-light">
            Browse through 24 premium custom posters, photo frames, personalized items, and minimal desk accessories.
          </p>
        </div>

        {/* Top Control Toolbar: Search, Filters Mobile Trigger, Sort & View Mode */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-6 mb-8 border-b border-neutral-200/80 dark:border-neutral-800/80">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <IconSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by keyword..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-mono text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-amber-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <IconX size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 justify-between md:justify-end">
            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-mono font-semibold"
            >
              <IconAdjustmentsHorizontal size={18} /> Filters
            </button>

            {/* Sorting Selector */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="hidden sm:inline text-neutral-400">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="py-2.5 px-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-xs font-mono focus:outline-none"
              >
                <option value="newest">Newest Arrivals</option>
                <option value="popular">Most Popular</option>
                <option value="rating">Highest Rated</option>
                <option value="price-low">Price: Low → High</option>
                <option value="price-high">Price: High → Low</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center p-1 rounded-xl bg-neutral-200/60 dark:bg-neutral-800/60">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "grid" ? "bg-white text-black dark:bg-neutral-900 dark:text-white" : "text-neutral-500"
                }`}
                title="Grid view"
              >
                <IconLayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "list" ? "bg-white text-black dark:bg-neutral-900 dark:text-white" : "text-neutral-500"
                }`}
                title="List view"
              >
                <IconList size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Pill Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-8">
            <span className="text-xs font-mono text-neutral-400">Active Filters:</span>
            {selectedCategory !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-mono">
                Category: {selectedCategory}
                <button onClick={() => setSelectedCategory("all")}><IconX size={14} /></button>
              </span>
            )}
            {selectedCollection !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-mono">
                Collection: {selectedCollection}
                <button onClick={() => setSelectedCollection("all")}><IconX size={14} /></button>
              </span>
            )}
            {maxPrice < 200 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-mono">
                Max Price: ${maxPrice}
                <button onClick={() => setMaxPrice(200)}><IconX size={14} /></button>
              </span>
            )}
            {inStockOnly && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-mono">
                In Stock Only
                <button onClick={() => setInStockOnly(false)}><IconX size={14} /></button>
              </span>
            )}
            {minRating > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-mono">
                Rating: {minRating}+ ★
                <button onClick={() => setMinRating(0)}><IconX size={14} /></button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-xs font-mono text-rose-500 underline ml-2 hover:text-rose-600"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Main Content Layout: Sidebar + Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block lg:col-span-3 space-y-6 p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 sticky top-28">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                Filter Catalog
              </h3>
              {hasActiveFilters && (
                <button onClick={clearAllFilters} className="text-[11px] font-mono text-neutral-400 hover:text-rose-500">
                  Reset
                </button>
              )}
            </div>

            {/* Categories */}
            <div>
              <h4 className="text-xs font-mono text-neutral-400 uppercase mb-3">Categories</h4>
              <div className="space-y-1.5 text-xs font-mono">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors flex justify-between ${
                    selectedCategory === "all" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold" : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  <span>All Categories</span>
                  <span>{PRODUCTS.length}</span>
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors flex justify-between ${
                      selectedCategory === cat.slug ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold" : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className="text-neutral-400">{cat.itemCount}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Slider */}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between text-xs font-mono text-neutral-400 mb-2">
                <span className="uppercase">Max Price</span>
                <span className="font-bold text-neutral-900 dark:text-white">${maxPrice}</span>
              </div>
              <input
                type="range"
                min="20"
                max="200"
                step="5"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-neutral-400 mt-1">
                <span>$20</span>
                <span>$200</span>
              </div>
            </div>

            {/* Availability */}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <label className="flex items-center gap-2 text-xs font-mono text-neutral-700 dark:text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded border-neutral-300 dark:border-neutral-700 text-amber-500 focus:ring-amber-400"
                />
                <span>In Stock Items Only</span>
              </label>
            </div>

            {/* Minimum Rating */}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <h4 className="text-xs font-mono text-neutral-400 uppercase mb-2">Minimum Rating</h4>
              <div className="flex gap-2">
                {[0, 4, 4.5, 4.8].map((star) => (
                  <button
                    key={star}
                    onClick={() => setMinRating(star)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center justify-center gap-0.5 ${
                      minRating === star
                        ? "bg-black text-white dark:bg-white dark:text-black border-transparent font-bold"
                        : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400"
                    }`}
                  >
                    {star === 0 ? "All" : `${star}★`}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Product Grid Area */}
          <div className="lg:col-span-9">
            <div className="flex items-center justify-between text-xs font-mono text-neutral-400 mb-6">
              <span>Showing {filteredProducts.length} of {PRODUCTS.length} products</span>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="p-16 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <p className="text-lg font-bold text-neutral-900 dark:text-white mb-2">No matching products found</p>
                <p className="text-xs text-neutral-400 mb-6 font-light max-w-sm mx-auto">
                  Try broadening your price range, clearing active filter tags, or searching for a different keyword.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="px-6 py-3 rounded-xl bg-amber-500 text-black font-semibold text-xs uppercase tracking-wider hover:bg-amber-400 transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                    : "flex flex-col gap-6"
                }
              >
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
