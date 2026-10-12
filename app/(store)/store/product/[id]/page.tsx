"use client";

import { useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Breadcrumbs from "@/components/store/Breadcrumbs";
import ProductCard from "@/components/store/ProductCard";
import { PRODUCTS } from "@/lib/data/storeData";
import { useStore } from "@/lib/store/useStore";
import { toast } from "sonner";
import {
  IconShoppingBag,
  IconHeart,
  IconHeartFilled,
  IconShare,
  IconTruck,
  IconShieldCheck,
  IconRefresh,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { addToCart, toggleWishlist, isInWishlist } = useStore();

  const product = PRODUCTS.find((p) => p.id === id || p.slug === id) || PRODUCTS[0];

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0]?.name || "");
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || "");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"specs" | "shipping" | "reviews">("specs");
  const [isZoomed, setIsZoomed] = useState(false);

  const isWishlisted = isInWishlist(product.id);

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedColor, selectedSize);
    toast.success(`Added ${product.title} to your cart!`);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity, selectedColor, selectedSize);
    router.push("/store/checkout");
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Product link copied to clipboard!");
    }
  };

  const relatedProducts = PRODUCTS.filter(
    (p) => p.categorySlug === product.categorySlug && p.id !== product.id
  ).slice(0, 4);

  return (
    <div className="py-8 min-h-screen">
      <div className="container-site">
        <Breadcrumbs
          items={[
            { label: "Shop", href: "/store/shop" },
            { label: product.category, href: `/store/category/${product.categorySlug}` },
            { label: product.title },
          ]}
        />

        {/* Product Details Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 my-8">
          {/* Gallery Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Main Interactive Zoom Image */}
            <div
              onClick={() => setIsZoomed(!isZoomed)}
              className="relative aspect-4/5 w-full rounded-3xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 cursor-zoom-in group shadow-xs"
            >
              <Image
                src={product.images[activeImageIndex] || product.images[0]}
                alt={product.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className={`object-cover object-center transition-transform duration-500 ${
                  isZoomed ? "scale-150" : "group-hover:scale-105"
                }`}
              />
              <div className="absolute bottom-4 right-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-mono">
                {isZoomed ? "Click to Zoom Out" : "Click to Zoom In"}
              </div>
            </div>

            {/* Thumbnail Row */}
            {product.images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto py-2 no-scrollbar">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative h-20 w-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                      activeImageIndex === idx
                        ? "border-lime-500 scale-105 shadow-md"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <Image src={img} alt="Gallery Thumb" fill sizes="80px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Purchase Form Column (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              {/* Category, Brand & Stock */}
              <div className="flex items-center justify-between text-xs font-mono text-neutral-400 mb-2">
                <span>{product.brand} • {product.category}</span>
                <span className="text-lime-600 dark:text-lime-400">Catalog preview</span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white mb-3">
                {product.title}
              </h1>

              {/* Product reference */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-xs font-mono text-neutral-400">SKU: {product.sku}</span>
                <span className="text-xs font-mono text-neutral-400">Availability confirmed after request</span>
              </div>

              {/* Draft price */}
              <div className="flex items-baseline gap-4 mb-6 p-4 rounded-2xl bg-neutral-100/70 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800/80">
                <span className="text-3xl font-bold font-mono text-neutral-900 dark:text-white">
                  ${product.price.toFixed(2)} est.
                </span>
              </div>

              {/* Short Description */}
              <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed mb-6 font-light">
                {product.description}
              </p>

              {/* Color Swatches */}
              {product.colors && product.colors.length > 0 && (
                <div className="mb-6">
                  <label className="block text-xs font-mono uppercase text-neutral-400 mb-2">
                    Color Finish: <strong className="text-neutral-900 dark:text-white font-sans">{selectedColor}</strong>
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {product.colors.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => setSelectedColor(color.name)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono border transition-all ${
                          selectedColor === color.name
                            ? "border-lime-500 bg-lime-500/10 text-lime-700 dark:text-lime-300 font-semibold"
                            : "border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400"
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-neutral-700"
                          style={{ backgroundColor: color.hex }}
                        />
                        {color.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selector */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="mb-8">
                  <label className="block text-xs font-mono uppercase text-neutral-400 mb-2">
                    Size Dimension: <strong className="text-neutral-900 dark:text-white font-sans">{selectedSize}</strong>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 rounded-xl text-xs font-mono border transition-all ${
                          selectedSize === size
                            ? "bg-black text-white dark:bg-white dark:text-black border-transparent font-bold"
                            : "border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions & Badges */}
            <div className="space-y-4 pt-6 border-t border-neutral-200 dark:border-neutral-800">
              {/* Quantity + Buttons */}
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 bg-white dark:bg-neutral-900">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 text-center text-neutral-500 hover:text-black dark:hover:text-white font-bold"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-mono font-semibold text-sm">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 text-center text-neutral-500 hover:text-black dark:hover:text-white font-bold"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-4 px-6 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <IconShoppingBag size={18} /> Add to Cart
                </button>

                <button
                  onClick={() => toggleWishlist(product)}
                  className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  aria-label="Wishlist"
                >
                  {isWishlisted ? <IconHeartFilled size={20} className="text-rose-500" /> : <IconHeart size={20} />}
                </button>

                <button
                  onClick={handleShare}
                  className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  aria-label="Share"
                >
                  <IconShare size={20} />
                </button>
              </div>

              {/* Direct Buy Now */}
              <button
                onClick={handleBuyNow}
                className="w-full py-4 px-6 rounded-2xl bg-lime-500 text-black font-bold text-xs uppercase tracking-wider hover:bg-lime-400 transition-colors shadow-md"
              >
                Buy Now — Instant Checkout
              </button>

              {/* Guarantees */}
              <div className="grid grid-cols-2 gap-3 pt-4 text-xs font-mono text-neutral-500">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-neutral-100/60 dark:bg-neutral-900/60">
                  <IconTruck size={18} className="text-lime-500 shrink-0" />
                  <span>Ships in 24-48 Hours</span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-neutral-100/60 dark:bg-neutral-900/60">
                  <IconShieldCheck size={18} className="text-lime-500 shrink-0" />
                  <span>30-Day Return Guarantee</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Specifications Tabs / Accordion */}
        <div className="my-16 p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs">
          <div className="flex border-b border-neutral-200 dark:border-neutral-800 gap-8 mb-8 font-mono text-xs uppercase tracking-wider">
            <button
              onClick={() => setActiveTab("specs")}
              className={`pb-4 transition-colors font-semibold ${
                activeTab === "specs"
                  ? "text-neutral-900 dark:text-white border-b-2 border-lime-500"
                  : "text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              Specifications & Origin
            </button>
            <button
              onClick={() => setActiveTab("shipping")}
              className={`pb-4 transition-colors font-semibold ${
                activeTab === "shipping"
                  ? "text-neutral-900 dark:text-white border-b-2 border-lime-500"
                  : "text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              Shipping & Care Policy
            </button>
          </div>

          {activeTab === "specs" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {product.specifications?.map((spec, i) => (
                <div key={i} className="flex justify-between py-3 border-b border-neutral-100 dark:border-neutral-800/60 text-xs font-mono">
                  <span className="text-neutral-400">{spec.label}</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{spec.value}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "shipping" && (
            <div className="space-y-4 text-xs md:text-sm text-neutral-600 dark:text-neutral-300 font-light leading-relaxed">
              <p>All ZeroCraft orders are carefully packaged in custom shock-absorbing recycled cardboard tubes or reinforced wooden edge boxes to prevent damage during transport.</p>
              <p>Standard delivery takes 3-5 business days. Express overnight courier options are available at checkout.</p>
            </div>
          )}
        </div>

        {/* Related Products Recommendations */}
        {relatedProducts.length > 0 && (
          <div className="my-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
                You May Also Like
              </h2>
              <Link href={`/store/category/${product.categorySlug}`} className="text-xs font-mono text-lime-600 dark:text-lime-400 hover:underline">
                View all in {product.category} →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((rel) => (
                <ProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
