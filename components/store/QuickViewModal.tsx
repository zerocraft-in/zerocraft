"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { IconX, IconShoppingBag } from "@/components/store/StoreIcon";
import { useStore } from "@/lib/store/useStore";
import { formatCatalogPrice } from "@/lib/commerce/format";

export default function QuickViewModal() {
  const { quickViewProduct, setQuickViewProduct, addToCart } = useStore();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);

  if (!quickViewProduct) return null;

  const product = quickViewProduct;
  const currentColor = selectedColor || (product.colors?.[0]?.name ?? "");
  const currentSize = selectedSize || (product.sizes?.[0] ?? "");

  const handleAddToCart = () => {
    addToCart(product, quantity, currentColor, currentSize);
    setQuickViewProduct(null);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setQuickViewProduct(null)}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden z-10 my-auto"
        >
          {/* Close Button */}
          <button
            onClick={() => setQuickViewProduct(null)}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <IconX size={20} />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Gallery Column */}
            <div className="p-6 bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center">
              <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-4 bg-neutral-200 dark:bg-neutral-800">
                <Image
                  src={product.images[selectedImageIndex] || product.images[0]}
                  alt={product.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto w-full py-1">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative h-16 w-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                        selectedImageIndex === idx
                          ? "border-lime-500 scale-105"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <Image src={img} alt="Thumbnail" fill sizes="64px" className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details Column */}
            <div className="p-6 md:p-8 flex flex-col justify-between">
              <div>
                {/* Category & SKU */}
                <div className="flex items-center justify-between text-xs font-mono text-neutral-400 mb-2">
                  <span>{product.category}</span>
                  <span>SKU: {product.sku}</span>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                  {product.title}
                </h2>

                {/* Catalog status */}
                <div className="flex items-center gap-4 mb-4 text-xs">
                  <span className="font-mono text-neutral-500">Catalog preview · Availability to be confirmed</span>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-3 mb-6">
                  <span className="text-3xl font-bold text-neutral-900 dark:text-white font-mono">
                    {formatCatalogPrice(product.price, product.currency)} est.
                  </span>
                </div>

                {/* Short Description */}
                <p className="text-xs md:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed mb-6">
                  {product.shortDescription}
                </p>

                {/* Color Selector */}
                {product.colors && product.colors.length > 0 && (
                  <div className="mb-5">
                    <span className="block text-xs font-mono uppercase text-neutral-400 mb-2">
                      Color: <strong className="text-neutral-900 dark:text-white font-sans">{currentColor}</strong>
                    </span>
                    <div className="flex gap-2">
                      {product.colors.map((c) => (
                        <button
                          key={c.name}
                          onClick={() => setSelectedColor(c.name)}
                          className={`w-7 h-7 rounded-full border-2 transition-transform ${
                            currentColor === c.name ? "border-lime-500 scale-110" : "border-neutral-300 dark:border-neutral-700"
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Size Selector */}
                {product.sizes && product.sizes.length > 0 && (
                  <div className="mb-6">
                    <span className="block text-xs font-mono uppercase text-neutral-400 mb-2">
                      Size: <strong className="text-neutral-900 dark:text-white font-sans">{currentSize}</strong>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((s) => (
                        <button
                          key={s}
                          onClick={() => setSelectedSize(s)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                            currentSize === s
                              ? "bg-black text-white dark:bg-white dark:text-black border-transparent"
                              : "border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
                {/* Quantity */}
                <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-xl px-2 py-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-bold"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-mono text-sm font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-bold"
                  >
                    +
                  </button>
                </div>

                {/* Add to Cart */}
                <button
                  onClick={handleAddToCart}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-black text-white dark:bg-white dark:text-black font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity shadow-lg"
                >
                  <IconShoppingBag size={18} />
                  Add to Cart
                </button>

              </div>

              {/* View Full Product Page Link */}
              <div className="mt-4 text-center">
                <Link
                  href={`/store/product/${product.id}`}
                  onClick={() => setQuickViewProduct(null)}
                  className="text-xs font-mono text-lime-600 dark:text-lime-400 hover:underline"
                >
                  View full specifications & customer reviews →
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
