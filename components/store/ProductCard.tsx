"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { IconHeart, IconHeartFilled, IconEye, IconShoppingBag, IconStarFilled } from "@tabler/icons-react";
import { Product } from "@/lib/data/storeData";
import { useStore } from "@/lib/store/useStore";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, toggleWishlist, isInWishlist, setQuickViewProduct } = useStore();
  const [isHovered, setIsHovered] = useState(false);
  const isWishlisted = isInWishlist(product.id);

  const discountPercent = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="group relative flex flex-col rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Wrapper */}
      <div className="relative aspect-4/5 w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
        <Link href={`/product/${product.id}`} className="block h-full w-full">
          <Image
            src={isHovered && product.images[1] ? product.images[1] : product.images[0]}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          />
        </Link>

        {/* Badges Top-Left */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
          {product.isNew && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-black text-white dark:bg-white dark:text-black shadow-xs">
              New
            </span>
          )}
          {product.isSale && discountPercent > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-rose-600 text-white shadow-xs">
              -{discountPercent}% OFF
            </span>
          )}
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
      <div className="flex flex-col flex-1 p-5">
        {/* Category & Rating Row */}
        <div className="flex items-center justify-between mb-1.5 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
          <span>{product.category}</span>
          <div className="flex items-center gap-1">
            <IconStarFilled size={13} className="text-amber-400" />
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{product.rating}</span>
            <span>({product.reviewCount})</span>
          </div>
        </div>

        {/* Title */}
        <Link href={`/product/${product.id}`} className="group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
          <h3 className="font-medium text-base text-neutral-900 dark:text-white line-clamp-1 mb-1">
            {product.title}
          </h3>
        </Link>

        {/* Short Description */}
        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1 mb-3">
          {product.shortDescription}
        </p>

        {/* Color Swatches & Price Footer */}
        <div className="mt-auto pt-3 border-t border-neutral-100 dark:border-neutral-800/60 flex items-center justify-between">
          {/* Swatches */}
          <div className="flex items-center gap-1.5">
            {product.colors.slice(0, 3).map((color, idx) => (
              <span
                key={idx}
                title={color.name}
                className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-neutral-700 shadow-xs"
                style={{ backgroundColor: color.hex }}
              />
            ))}
            {product.colors.length > 3 && (
              <span className="text-[10px] text-neutral-400 font-mono">+ {product.colors.length - 3}</span>
            )}
          </div>

          {/* Pricing */}
          <div className="flex items-baseline gap-2">
            {product.originalPrice > product.price && (
              <span className="text-xs text-neutral-400 line-through font-mono">
                ${product.originalPrice.toFixed(2)}
              </span>
            )}
            <span className="text-sm font-semibold text-neutral-900 dark:text-white font-mono">
              ${product.price.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
