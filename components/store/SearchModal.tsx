"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { IconSearch, IconX, IconArrowRight, IconShoppingBag } from "@tabler/icons-react";
import { useStore } from "@/lib/store/useStore";
import { PRODUCTS } from "@/lib/data/storeData";

export default function SearchModal() {
  const { searchModalOpen, toggleSearchModal, addToCart } = useStore();
  const [query, setQuery] = useState("");

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && searchModalOpen) {
        toggleSearchModal(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleSearchModal(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchModalOpen, toggleSearchModal]);

  const filteredProducts = query.trim() === ""
    ? PRODUCTS.slice(0, 4)
    : PRODUCTS.filter((p) =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase()) ||
        p.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      );

  return (
    <AnimatePresence>
      {searchModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-start justify-center pt-16 md:pt-28 px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => toggleSearchModal(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden z-10"
          >
            {/* Search Input Bar */}
            <div className="relative flex items-center px-5 border-b border-neutral-200 dark:border-neutral-800">
              <IconSearch size={22} className="text-neutral-400 mr-3" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, categories, tags... (Press Esc to close)"
                className="w-full py-5 bg-transparent text-base text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none"
              />
              {query && (
                <button onClick={() => setQuery("")} className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-white">
                  <IconX size={18} />
                </button>
              )}
            </div>

            {/* Content Body */}
            <div className="max-h-[60vh] overflow-y-auto p-5 no-scrollbar">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
                  {query.trim() === "" ? "Popular Products" : `Results (${filteredProducts.length})`}
                </span>
                <span className="text-[11px] font-mono text-neutral-400">
                  Press ESC or ⌘K
                </span>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 dark:text-neutral-400">
                  <p className="text-sm mb-2 font-medium">No matching products found for &ldquo;{query}&rdquo;</p>
                  <p className="text-xs font-light">Try searching for &ldquo;poster&rdquo;, &ldquo;frame&rdquo;, &ldquo;leather&rdquo;, or &ldquo;brass&rdquo;.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="group flex items-center justify-between p-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors"
                    >
                      <Link
                        href={`/store/product/${product.id}`}
                        onClick={() => toggleSearchModal(false)}
                        className="flex items-center gap-3.5 flex-1 min-w-0"
                      >
                        <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0">
                          <Image
                            src={product.images[0]}
                            alt={product.title}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-medium text-neutral-900 dark:text-white line-clamp-1 group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors">
                            {product.title}
                          </h4>
                          <span className="text-xs text-neutral-400 font-mono">
                            {product.category} • ${product.price.toFixed(2)}
                          </span>
                        </div>
                      </Link>

                      <button
                        onClick={() => {
                          addToCart(product, 1);
                          toggleSearchModal(false);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black text-xs font-semibold hover:opacity-90 transition-opacity"
                      >
                        <IconShoppingBag size={14} /> Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs font-mono text-neutral-500">
              <span>ZeroCraft Store live search</span>
              <Link
                href="/store/shop"
                onClick={() => toggleSearchModal(false)}
                className="flex items-center gap-1 text-lime-600 dark:text-lime-400 font-semibold hover:underline"
              >
                View full shop catalog <IconArrowRight size={14} />
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
