"use client";

import { useState, use, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Breadcrumbs from "@/components/store/Breadcrumbs";
import ProductCard from "@/components/store/ProductCard";
import type { CatalogProduct } from "@/lib/commerce/catalog";
import { useStore } from "@/lib/store/useStore";
import { formatCatalogPrice } from "@/lib/commerce/format";
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

  const [catalogProduct, setCatalogProduct] = useState<CatalogProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<CatalogProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/store/catalog?id=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!cancelled && payload?.product) setCatalogProduct(payload.product);
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const activeProduct = catalogProduct;
  const selectedVariant = activeProduct?.variants.find((variant) => variant.id === selectedVariantId) ?? activeProduct?.variants[0];
  const displayPrice = selectedVariant?.price ?? activeProduct?.price ?? 0;
  const displayCurrency = selectedVariant?.currency ?? activeProduct?.currency ?? null;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"specs" | "shipping" | "reviews">("specs");
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (!activeProduct) return;
    fetch(`/api/store/catalog?category=${encodeURIComponent(activeProduct.categorySlug)}&pageSize=5`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => setRelatedProducts((payload?.products?.products ?? []).filter((product: { id: string }) => product.id !== activeProduct.id).slice(0, 4)))
      .catch(() => setRelatedProducts([]));
  }, [activeProduct]);

  const isWishlisted = isInWishlist(activeProduct?.id ?? "");
  const effectiveSelectedColor = selectedColor || activeProduct?.colors?.[0]?.name || "";
  const effectiveSelectedSize = selectedSize || activeProduct?.sizes?.[0] || "";

  const handleAddToCart = () => {
    if (!activeProduct) return;
    addToCart(activeProduct, quantity, effectiveSelectedColor, effectiveSelectedSize, selectedVariant?.id, selectedVariant?.label);
    toast.success(`Added ${activeProduct.title} to your cart!`);
  };

  const handleBuyNow = () => {
    if (!activeProduct) return;
    addToCart(activeProduct, quantity, effectiveSelectedColor, effectiveSelectedSize, selectedVariant?.id, selectedVariant?.label);
    router.push("/store/checkout");
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Product link copied to clipboard!");
    }
  };

  if (isLoading) {
    return <div className="container-site py-24 text-center text-sm text-neutral-500">Loading product details...</div>;
  }

  if (!activeProduct) {
    return <div className="container-site py-24 text-center"><h1 className="text-2xl font-semibold">Product not found</h1><p className="mt-2 text-sm text-neutral-500">This product is no longer published or could not be loaded.</p><Link href="/store/shop" className="mt-6 inline-block text-sm text-lime-600 hover:underline">Return to the shop</Link></div>;
  }

  return (
    <div className="py-8 min-h-screen">
      <div className="container-site">
        <Breadcrumbs
          items={[
            { label: "Shop", href: "/store/shop" },
            { label: activeProduct.category, href: `/store/category/${activeProduct.categorySlug}` },
            { label: activeProduct.title },
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
                src={activeProduct.images[activeImageIndex] || activeProduct.images[0]}
                alt={activeProduct.title}
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
            {activeProduct.images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto py-2 no-scrollbar">
                {activeProduct.images.map((img, idx) => (
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
                <span>{activeProduct.brand} • {activeProduct.category}</span>
                <span className="text-lime-600 dark:text-lime-400">Catalog preview</span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white mb-3">
                {activeProduct.title}
              </h1>

              {/* Product reference */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-xs font-mono text-neutral-400">SKU: {activeProduct.sku}</span>
                <span className="text-xs font-mono text-neutral-400">Availability confirmed after request</span>
              </div>

              {/* Draft price */}
              <div className="flex items-baseline gap-4 mb-6 p-4 rounded-2xl bg-neutral-100/70 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800/80">
                <span className="text-3xl font-bold font-mono text-neutral-900 dark:text-white">
                  {formatCatalogPrice(displayPrice, displayCurrency)}
                </span>
              </div>

              {/* Short Description */}
              <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed mb-6 font-light">
                {activeProduct.description}
              </p>

              {activeProduct.variants.length > 1 && (
                <div className="mb-6">
                  <label className="block text-xs font-mono uppercase text-neutral-400 mb-2">Variant</label>
                  <div className="flex flex-wrap gap-2">
                    {activeProduct.variants.map((variant) => (
                      <button key={variant.id} onClick={() => setSelectedVariantId(variant.id)} className={`px-4 py-2 rounded-xl text-xs font-mono border transition-all ${selectedVariant?.id === variant.id ? "bg-black text-white dark:bg-white dark:text-black border-transparent font-bold" : "border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400"}`}>
                        {variant.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color Swatches */}
              {activeProduct.colors && activeProduct.colors.length > 0 && (
                <div className="mb-6">
                  <label className="block text-xs font-mono uppercase text-neutral-400 mb-2">
                    Color Finish: <strong className="text-neutral-900 dark:text-white font-sans">{effectiveSelectedColor}</strong>
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {activeProduct.colors.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => setSelectedColor(color.name)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono border transition-all ${
                        effectiveSelectedColor === color.name
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
              {activeProduct.sizes && activeProduct.sizes.length > 0 && (
                <div className="mb-8">
                  <label className="block text-xs font-mono uppercase text-neutral-400 mb-2">
                    Size Dimension: <strong className="text-neutral-900 dark:text-white font-sans">{effectiveSelectedSize}</strong>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {activeProduct.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 rounded-xl text-xs font-mono border transition-all ${
                        effectiveSelectedSize === size
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
                  onClick={() => toggleWishlist(activeProduct)}
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
              {activeProduct.specifications?.map((spec, i) => (
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
              <Link href={`/store/category/${activeProduct.categorySlug}`} className="text-xs font-mono text-lime-600 dark:text-lime-400 hover:underline">
                View all in {activeProduct.category} →
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
