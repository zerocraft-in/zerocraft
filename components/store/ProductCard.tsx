"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { IconHeart, IconHeartFilled, IconEye, IconShoppingBag } from "@tabler/icons-react";
import { Product } from "@/lib/data/storeData";
import { useStore } from "@/lib/store/useStore";
import { formatCatalogPrice } from "@/lib/commerce/format";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, toggleWishlist, isInWishlist, setQuickViewProduct } = useStore();
  const [isHovered, setIsHovered] = useState(false);
  const isWishlisted = isInWishlist(product.id);
  const images = product.images?.filter(Boolean) ?? [];
  const primaryImage = images[0] || "/images/products/posterized-art-print-mockup.png";
  const secondaryImage = images[1] || primaryImage;
  const isMerch = /t-?shirt|hoodie|merch|apparel/i.test(`${product.title} ${product.category}`);


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#151515]/10 bg-white shadow-[0_8px_24px_rgba(20,20,20,.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(20,20,20,.10)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Wrapper */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#e8e4dc]">
        <Link href={`/store/product/${product.id}`} className="block h-full w-full">
          <Image
            src={isHovered ? secondaryImage : primaryImage}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        </Link>

        {/* Badges Top-Left */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
          <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-black shadow-sm">{isMerch ? "Merch" : "Print"}</span>
        </div>

        {/* Action Floating Buttons Top-Right */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
          <button
            onClick={() => toggleWishlist(product)}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md text-neutral-800 dark:text-neutral-200 shadow-md hover:scale-110 active:scale-95 transition-all"
          >
            {isWishlisted ? (
              <IconHeartFilled size={18} className="text-rose-500" />
            ) : (
              <IconHeart size={18} />
            )}
          </button>
          <button
            onClick={() => setQuickViewProduct(product)}
            aria-label="Quick view"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md text-neutral-800 dark:text-neutral-200 shadow-md hover:scale-110 active:scale-95 transition-all"
          >
            <IconEye size={18} />
          </button>
        </div>

        {/* Add to Cart Overlay Slide-up Button */}
        <div className="absolute bottom-3 inset-x-3 z-10 transition-all duration-300 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
          <button
            onClick={() => addToCart(product, 1)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-semibold uppercase tracking-wider shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <IconShoppingBag size={16} />
            Add to Cart
          </button>
        </div>
      </div>

      {/* Product Content Details */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <Link href={`/store/product/${product.id}`} className="transition-colors hover:text-[#e34d2e]">
          <h3 className="mb-1 line-clamp-1 text-sm font-black leading-5 tracking-tight text-[#151515] sm:text-base">
            {product.title}
          </h3>
        </Link>
        <div className="mt-auto flex items-baseline gap-2 pt-4">
          {product.originalPrice > product.price && <span className="text-xs text-[#151515]/40 line-through">{formatCatalogPrice(product.originalPrice, product.currency)}</span>}
          <span className="text-base font-black tracking-tight text-[#151515]">{formatCatalogPrice(product.price, product.currency)}</span>
        </div>
      </div>
    </motion.div>
  );
}
