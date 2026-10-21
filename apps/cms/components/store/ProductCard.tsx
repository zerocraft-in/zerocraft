"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  IconEye,
  IconShoppingBag,
} from "@/components/store/StoreIcon";
import { Product } from "@/lib/data/storeData";
import { useStore } from "@/lib/store/useStore";
import { formatCatalogPrice } from "@/lib/commerce/format";
import { trackStoreEvent } from "@/lib/commerce/store-events";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export default function ProductCard({
  product,
  priority = false,
}: ProductCardProps) {
  const { addToCart, setQuickViewProduct } =
    useStore();
  const [isHovered, setIsHovered] = useState(false);
  const images = product.images?.filter(Boolean) ?? [];
  const primaryImage = images[0] || "/hero-designer.png";
  const secondaryImage = images[1] || primaryImage;
  const isMerch = /t-?shirt|hoodie|merch|apparel/i.test(
    `${product.title} ${product.category}`,
  );
  const designOrigin = (product as unknown as { designOrigin?: string })
    .designOrigin;
  const subcategory = (product as unknown as { subcategory?: string })
    .subcategory;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="store-product-card group relative flex min-w-0 flex-col overflow-hidden rounded-[10px] border border-black/20 bg-white/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#e34d2e]  hover:outline-[#e34d2e]/25 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#e34d2e]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-1 flex-col p-1 rouned-md">
        {/* Image Wrapper */}
        <div className="relative aspect-[4/5] w-full overflow-hidden border-b border-black/15 bg-[#e8e4dc] rounded-md">
          <Link
            href={`/store/product/${product.id}`}
            className="relative block h-full w-full"
            onClick={() =>
              trackStoreEvent("select_item", {
                productId: product.id,
                productName: product.title,
              })
            }
          >
            <Image
              src={isHovered ? secondaryImage : primaryImage}
              alt={product.title}
              fill
              priority={priority}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
          </Link>

          {/* Badges Top-Left */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
            <span className="inline-flex items-center rounded-[6px] border border-black/15 bg-white/95 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-black">
              {isMerch ? "Merch" : "Print"}
            </span>
            {designOrigin && designOrigin !== "original_zerocraft" && (
              <span className="inline-flex items-center rounded-[6px] border border-white/20 bg-black/80 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white">
                {designOrigin === "licensed" ? "Licensed" : "Fan-inspired"}
              </span>
            )}
          </div>

          {/* Action Floating Buttons Top-Right */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
            <button
              onClick={() => setQuickViewProduct(product)}
              aria-label="Quick view"
              className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-black/25 bg-white/95 backdrop-blur-md text-neutral-800 transition-all hover:scale-105 hover:border-[#e34d2e] hover:text-[#e34d2e] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e34d2e]"
            >
              <IconEye size={18} />
            </button>
          </div>

          {/* Add to Cart Overlay Slide-up Button */}
          <div className="absolute inset-x-3 bottom-3 z-10 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <button
              onClick={() => {
                addToCart(product, 1);
                trackStoreEvent("add_to_cart", {
                  productId: product.id,
                  productName: product.title,
                  price: product.price,
                });
              }}
              className="group/cta relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[8px] border border-white/20 border-b-black/80 bg-gradient-to-b from-[#3a3835] via-[#211f1d] to-[#151311] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white outline-none backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-2px_0_rgba(0,0,0,0.45),0_2px_0_rgba(21,19,17,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f27a60] hover:bg-gradient-to-b hover:from-[#ef6748] hover:via-[#e34d2e] hover:to-[#c83f25] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-2px_0_rgba(120,28,12,0.45),0_3px_0_rgba(21,19,17,0.3)] active:translate-y-0.5 active:shadow-[inset_0_2px_3px_rgba(0,0,0,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e34d2e]"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[#f3f0e8] opacity-[0.3] mix-blend-screen transition-all duration-500 group-hover/cta:scale-105 group-hover/cta:opacity-[0.62]"
              />
              <span className="relative z-10 flex items-center justify-center gap-2">
                <IconShoppingBag size={16} />
                <span>Add to Cart</span>
              </span>
            </button>
          </div>
        </div>

        {/* Product Content Details */}
        <div className="flex flex-1 flex-col border-t border-transparent p-2">
          <Link
            href={`/store/product/${product.id}`}
            className="transition-colors hover:text-[#e34d2e]"
          >
            <h3 className="mb-1 line-clamp-1 text-sm font-black leading-5 tracking-tight text-[#151515] sm:text-base">
              {product.title}
            </h3>
            {subcategory && (
              <p className="line-clamp-1 text-[9px] font-bold uppercase tracking-[.14em] text-black/40">
                {subcategory}
              </p>
            )}
          </Link>
          <div className="mt-auto flex items-baseline gap-2">
            {product.originalPrice > product.price && (
              <span className="text-xs text-[#151515]/40 line-through">
                {formatCatalogPrice(product.originalPrice, product.currency)}
              </span>
            )}
            <span className="text-base font-black tracking-tight text-[#151515]">
              {formatCatalogPrice(product.price, product.currency)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
