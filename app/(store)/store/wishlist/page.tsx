"use client";

import Link from "next/link";
import Breadcrumbs from "@/components/store/Breadcrumbs";
import ProductCard from "@/components/store/ProductCard";
import { useStore } from "@/lib/store/useStore";
import { IconHeart, IconShoppingBag, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";

export default function WishlistPage() {
  const { wishlist, clearWishlist, addToCart } = useStore();

  const handleMoveAllToCart = () => {
    wishlist.forEach((product) => {
      addToCart(product, 1);
    });
    clearWishlist();
    toast.success("Moved all wishlist items to your shopping cart!");
  };

  return (
    <div className="py-8 min-h-screen">
      <div className="container-site">
        <Breadcrumbs items={[{ label: "Wishlist" }]} />

        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 my-8 pb-6 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <span className="text-label text-amber-600 dark:text-amber-400 mb-2 block">
              Saved Pieces
            </span>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white">
              My Wishlist ({wishlist.length})
            </h1>
          </div>

          {wishlist.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={clearWishlist}
                className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-mono text-neutral-600 dark:text-neutral-300 hover:text-rose-500 transition-colors flex items-center gap-1.5"
              >
                <IconTrash size={16} /> Clear Wishlist
              </button>
              <button
                onClick={handleMoveAllToCart}
                className="px-5 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-2 shadow-xs"
              >
                <IconShoppingBag size={16} /> Move All to Cart
              </button>
            </div>
          )}
        </div>

        {/* Wishlist Items Grid */}
        {wishlist.length === 0 ? (
          <div className="p-16 text-center rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 my-12">
            <IconHeart size={48} className="mx-auto mb-4 text-neutral-300 dark:text-neutral-700" />
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
              Your wishlist is currently empty
            </h3>
            <p className="text-xs text-neutral-500 font-light max-w-sm mx-auto mb-6">
              Save your favorite posters, frames, and customized gifts to review them later or move them directly into your shopping cart.
            </p>
            <Link
              href="/shop"
              className="inline-flex px-6 py-3 rounded-xl bg-amber-500 text-black font-semibold text-xs uppercase tracking-wider hover:bg-amber-400 transition-colors"
            >
              Explore Shop Catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-8">
            {wishlist.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
