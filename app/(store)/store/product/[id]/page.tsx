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
import { trackStoreEvent } from "@/lib/commerce/store-events";
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
  IconPrinter,
  IconSparkles,
  IconTag,
  IconPackage,
} from "@/components/store/StoreIcon";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { addToCart, toggleWishlist, isInWishlist } = useStore();

  const [catalogProduct, setCatalogProduct] = useState<CatalogProduct | null>(
    null,
  );
  const [relatedProducts, setRelatedProducts] = useState<CatalogProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState<
    string | undefined
  >();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/store/catalog?id=${encodeURIComponent(id)}`, {
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled && payload?.product) setCatalogProduct(payload.product);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const activeProduct = catalogProduct;
  const selectedVariant =
    activeProduct?.variants.find(
      (variant) => variant.id === selectedVariantId,
    ) ?? activeProduct?.variants[0];
  const displayPrice = selectedVariant?.price ?? activeProduct?.price ?? 0;
  const displayCurrency =
    selectedVariant?.currency ?? activeProduct?.currency ?? null;
  const availableStock = activeProduct
    ? activeProduct.stock ||
      activeProduct.variants.reduce(
        (total, variant) => total + (variant.stock ?? 0),
        0,
      )
    : 0;
  const originalDisplayPrice = activeProduct?.originalPrice ?? displayPrice;
  const savingsPercent =
    originalDisplayPrice > displayPrice
      ? Math.round(
          ((originalDisplayPrice - displayPrice) / originalDisplayPrice) * 100,
        )
      : 0;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"specs" | "shipping" | "reviews">(
    "specs",
  );
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (!activeProduct) return;
    trackStoreEvent("view_item", {
      productId: activeProduct.id,
      productName: activeProduct.title,
      category: activeProduct.category,
      price: activeProduct.price,
      currency: activeProduct.currency,
    });
    const scriptId = "zerocraft-product-jsonld";
    const existing = document.getElementById(scriptId);
    existing?.remove();
    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: activeProduct.title,
      description: activeProduct.description,
      sku: activeProduct.sku,
      image: activeProduct.images,
      brand: { "@type": "Brand", name: "Zerocraft Studio" },
      category: activeProduct.category,
      offers: {
        "@type": "Offer",
        priceCurrency: displayCurrency || "INR",
        price: displayPrice,
        availability:
          availableStock > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        url: `${window.location.origin}/store/product/${activeProduct.id}`,
      },
    });
    document.head.appendChild(script);
    fetch(
      `/api/store/catalog?category=${encodeURIComponent(activeProduct.categorySlug)}&pageSize=5`,
      { cache: "no-store" },
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) =>
        setRelatedProducts(
          (payload?.products?.products ?? [])
            .filter(
              (product: { id: string }) => product.id !== activeProduct.id,
            )
            .slice(0, 4),
        ),
      )
      .catch(() => setRelatedProducts([]));
    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [activeProduct, availableStock, displayCurrency, displayPrice]);

  const isWishlisted = isInWishlist(activeProduct?.id ?? "");
  const effectiveSelectedColor =
    selectedColor || activeProduct?.colors?.[0]?.name || "";
  const effectiveSelectedSize = selectedSize || activeProduct?.sizes?.[0] || "";

  const handleAddToCart = () => {
    if (!activeProduct) return;
    addToCart(
      activeProduct,
      quantity,
      effectiveSelectedColor,
      effectiveSelectedSize,
      selectedVariant?.id,
      selectedVariant?.label,
    );
    trackStoreEvent("add_to_cart", {
      productId: activeProduct.id,
      productName: activeProduct.title,
      variantId: selectedVariant?.id,
      quantity,
      price: displayPrice,
      currency: displayCurrency,
    });
    toast.success(`Added ${activeProduct.title} to your cart!`);
  };

  const handleBuyNow = () => {
    if (!activeProduct) return;
    addToCart(
      activeProduct,
      quantity,
      effectiveSelectedColor,
      effectiveSelectedSize,
      selectedVariant?.id,
      selectedVariant?.label,
    );
    trackStoreEvent("add_to_cart", {
      productId: activeProduct.id,
      productName: activeProduct.title,
      variantId: selectedVariant?.id,
      quantity,
      price: displayPrice,
      currency: displayCurrency,
      buyNow: true,
    });
    router.push("/store/checkout");
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Product link copied to clipboard!");
    }
  };

  if (isLoading) {
    return (
      <div className="container-site py-24 text-center text-sm text-black/50">
        Loading product details...
      </div>
    );
  }

  if (!activeProduct) {
    return (
      <div className="container-site py-24 text-center">
        <h1 className="text-2xl font-semibold text-[#151311]">
          Product not found
        </h1>
        <p className="mt-2 text-sm text-black/50">
          This product is no longer published or could not be loaded.
        </p>
        <Link
          href="/store/shop"
          className="mt-6 inline-block text-sm text-[#e34d2e] hover:underline"
        >
          Return to the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="store-product-page py-10 min-h-screen bg-transparent text-[#151311]">
      <div className="container-site">
        <Breadcrumbs
          items={[
            { label: "Shop", href: "/store/shop" },
            {
              label: activeProduct.category,
              href: `/store/category/${activeProduct.categorySlug}`,
            },
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
              className="relative aspect-4/5 w-full overflow-hidden rounded-[8px] bg-[#e9e2d7] border border-black/10 cursor-zoom-in group"
            >
              <Image
                src={
                  activeProduct.images[activeImageIndex] ||
                  activeProduct.images[0]
                }
                alt={activeProduct.title}
                fill
                priority
                loading="eager"
                sizes="(max-width: 1024px) 100vw, 50vw"
                className={`object-cover object-center transition-transform duration-500 ${
                  isZoomed ? "scale-150" : "group-hover:scale-105"
                }`}
              />
              <div className="absolute bottom-4 right-4 px-3 py-1 rounded-[5px] bg-[#151311]/85 text-white text-[10px] font-mono">
                {isZoomed ? "Click to Zoom Out" : "Click to Zoom In"}
              </div>
            </div>

            {/* Thumbnail Row */}
            <div className="flex items-center justify-between gap-3 overflow-x-auto py-2 no-scrollbar">
              <div className="flex items-center gap-3">
                {activeProduct.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative h-20 w-20 rounded-[10px] overflow-hidden shrink-0 border-2 transition-all ${
                      activeImageIndex === idx
                        ? "border-[#e34d2e] scale-105"
                        : "border-black/10 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={img}
                      alt="Gallery Thumb"
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
              <span className="shrink-0 text-[10px] font-mono uppercase tracking-[0.14em] text-black/45">
                {String(activeImageIndex + 1).padStart(2, "0")} /{" "}
                {String(activeProduct.images.length).padStart(2, "0")}
              </span>
            </div>
          </div>

          {/* Product Purchase Form Column (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              {/* Category, Brand & Stock */}
              <div className="flex items-center justify-between text-xs font-mono text-black/45 mb-2">
                <span>
                  {activeProduct.brand} • {activeProduct.category}
                </span>
                <span className="text-[#e34d2e]">Catalog preview</span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl font-secondary font-bold tracking-tight text-[#151311] mb-3">
                {activeProduct.title}
              </h1>

              {/* Product reference */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-xs font-mono text-black/45">
                  SKU: {activeProduct.sku}
                </span>
                <span className="text-xs font-mono text-black/45">
                  Availability confirmed after request
                </span>
              </div>

              {/* Draft price */}
              <div className="mb-6 rounded-[10px] bg-white/70 border border-black/15 p-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="text-3xl font-bold font-mono text-[#151311]">
                    {formatCatalogPrice(displayPrice, displayCurrency)}
                  </span>
                  {originalDisplayPrice > displayPrice && (
                    <span className="text-sm font-mono text-black/40 line-through">
                      MRP{" "}
                      {formatCatalogPrice(
                        originalDisplayPrice,
                        displayCurrency,
                      )}
                    </span>
                  )}
                  {savingsPercent > 0 && (
                    <span className="rounded-[5px] border border-[#e34d2e]/30 bg-[#e34d2e]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#e34d2e]">
                      Save {savingsPercent}%
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[10px] font-mono uppercase tracking-[0.12em] text-black/45">
                  Inclusive of applicable taxes · Final price shown at checkout
                </p>
              </div>

              {/* Short Description */}
              <p className="text-sm text-black/65 leading-relaxed mb-6 font-light">
                {activeProduct.description}
              </p>

              <div className="mb-7 grid grid-cols-2 gap-x-5 gap-y-3 border-y border-black/10 py-4 text-xs">
                <div>
                  <span className="block text-[10px] font-mono uppercase tracking-[0.12em] text-black/40">
                    Availability
                  </span>
                  <strong className="mt-1 block font-medium text-[#151311]">
                    {availableStock > 0
                      ? `${availableStock} in stock`
                      : "Made to order"}
                  </strong>
                </div>
                <div>
                  <span className="block text-[10px] font-mono uppercase tracking-[0.12em] text-black/40">
                    Product code
                  </span>
                  <strong className="mt-1 block font-medium text-[#151311]">
                    {activeProduct.sku}
                  </strong>
                </div>
                <div>
                  <span className="block text-[10px] font-mono uppercase tracking-[0.12em] text-black/40">
                    Design origin
                  </span>
                  <strong className="mt-1 block font-medium text-[#151311]">
                    {activeProduct.designOrigin === "original_zerocraft"
                      ? "Original Zerocraft"
                      : activeProduct.designOrigin === "licensed"
                        ? "Licensed design"
                        : "Fan-inspired"}
                  </strong>
                </div>
                <div>
                  <span className="block text-[10px] font-mono uppercase tracking-[0.12em] text-black/40">
                    Category
                  </span>
                  <strong className="mt-1 block font-medium text-[#151311]">
                    {activeProduct.category}
                    {activeProduct.subcategory
                      ? ` · ${activeProduct.subcategory}`
                      : ""}
                  </strong>
                </div>
              </div>

              {activeProduct.variants.length > 1 && (
                <div className="mb-6">
                  <label className="block text-xs font-mono uppercase text-black/45 mb-2">
                    Variant
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {activeProduct.variants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`px-4 py-2 rounded-[10px] text-xs font-mono border transition-all ${selectedVariant?.id === variant.id ? "bg-[#151311] text-white border-[#151311] font-bold" : "border-black/20 text-black/70 hover:border-[#e34d2e]"}`}
                      >
                        {variant.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color Swatches */}
              {activeProduct.colors && activeProduct.colors.length > 0 && (
                <div className="mb-6">
                  <label className="block text-xs font-mono uppercase text-black/45 mb-2">
                    Color Finish:{" "}
                    <strong className="text-[#151311] font-sans">
                      {effectiveSelectedColor}
                    </strong>
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {activeProduct.colors.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => setSelectedColor(color.name)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-xs font-mono border transition-all ${
                          effectiveSelectedColor === color.name
                            ? "border-[#e34d2e] bg-[#e34d2e]/10 text-[#151311] font-semibold"
                            : "border-black/15 text-black/70 hover:border-[#e34d2e]"
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/20"
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
                  <label className="block text-xs font-mono uppercase text-black/45 mb-2">
                    Size Dimension:{" "}
                    <strong className="text-[#151311] font-sans">
                      {effectiveSelectedSize}
                    </strong>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {activeProduct.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 rounded-[10px] text-xs font-mono border transition-all ${
                          effectiveSelectedSize === size
                            ? "bg-[#151311] text-white border-[#151311] font-bold"
                            : "border-black/15 text-black/70 hover:border-[#e34d2e]"
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
            <div className="space-y-4 pt-6 border-t border-black/10">
              {/* Quantity + Buttons */}
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-black/20 rounded-[10px] px-3 py-2 bg-white/70">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 text-center text-black/50 hover:text-[#e34d2e] font-bold"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-mono font-semibold text-sm">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 text-center text-black/50 hover:text-[#e34d2e] font-bold"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-4 px-6 rounded-[10px] border border-[#151311] bg-[#151311] text-white font-semibold text-xs uppercase tracking-wider hover:bg-[#e34d2e] hover:border-[#e34d2e] transition-all flex items-center justify-center gap-2"
                >
                  <IconShoppingBag size={18} /> Add to Cart
                </button>

                <button
                  onClick={() => toggleWishlist(activeProduct)}
                  className="p-4 rounded-[10px] border border-black/20 bg-white/55 text-black/65 hover:border-[#e34d2e] transition-colors"
                  aria-label="Wishlist"
                >
                  {isWishlisted ? (
                    <IconHeartFilled size={20} className="text-rose-500" />
                  ) : (
                    <IconHeart size={20} />
                  )}
                </button>

                <button
                  onClick={handleShare}
                  className="p-4 rounded-[10px] border border-black/20 bg-white/55 text-black/65 hover:border-[#e34d2e] transition-colors"
                  aria-label="Share"
                >
                  <IconShare size={20} />
                </button>
              </div>

              {/* Direct Buy Now */}
              <button
                onClick={handleBuyNow}
                className="w-full py-4 px-6 rounded-[10px] border border-[#e34d2e] bg-[#e34d2e] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#c83f25] transition-colors"
              >
                Buy Now — Instant Checkout
              </button>

              {/* Guarantees */}
              <div className="grid grid-cols-2 gap-3 pt-4 text-xs font-mono text-black/55">
                <div className="flex items-center gap-2 p-3 rounded-[10px] bg-[#efe8dc] border border-black/15">
                  <IconTruck size={18} className="text-[#e34d2e] shrink-0" />
                  <span>Ships in 24-48 Hours</span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-[10px] bg-[#efe8dc] border border-black/15">
                  <IconShieldCheck
                    size={18}
                    className="text-[#f5b544] shrink-0"
                  />
                  <span>30-Day Return Guarantee</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Specifications Tabs / Accordion */}
        <div className="relative my-16">
          <div aria-hidden="true" className="pointer-events-none absolute -right-2 -top-8 hidden items-center gap-3 text-[#e34d2e]/70 lg:flex">
            <IconPrinter size={20} className="transition-transform duration-300 hover:-rotate-6" />
            <span className="h-px w-12 bg-[#e34d2e]/30" />
            <IconSparkles size={18} className="transition-transform duration-300 hover:rotate-12" />
          </div>
          <div className="rounded-[12px] border border-black/10 bg-[#151311] p-1 text-white transition-colors duration-300 hover:border-[#e34d2e]/40">
            <div className="rounded-[10px] border border-white/10 bg-[#151311] p-8 text-white">
              <div className="flex border-b border-white/10 gap-8 mb-8 font-mono text-xs uppercase tracking-wider">
                <button
                  onClick={() => setActiveTab("specs")}
                  className={`group inline-flex items-center gap-2 pb-4 transition-all duration-300 font-semibold ${
                    activeTab === "specs"
                      ? "text-white border-b-2 border-[#e34d2e]"
                      : "text-white/45 hover:text-white"
                  }`}
                >
                  <IconTag size={15} className="transition-transform duration-300 group-hover:scale-110" />
                  Specifications & Origin
                </button>
                <button
                  onClick={() => setActiveTab("shipping")}
                  className={`group inline-flex items-center gap-2 pb-4 transition-all duration-300 font-semibold ${
                    activeTab === "shipping"
                      ? "text-white border-b-2 border-[#e34d2e]"
                      : "text-white/45 hover:text-white"
                  }`}
                >
                  <IconTruck size={15} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                  Shipping & Care Policy
                </button>
              </div>

              {activeTab === "specs" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(activeProduct.specifications?.length
                    ? activeProduct.specifications
                    : [
                        { label: "Product", value: activeProduct.title },
                        {
                          label: "Category",
                          value: activeProduct.subcategory
                            ? `${activeProduct.category} · ${activeProduct.subcategory}`
                            : activeProduct.category,
                        },
                        {
                          label: "Design origin",
                          value:
                            activeProduct.designOrigin === "original_zerocraft"
                              ? "Original Zerocraft design"
                              : activeProduct.designOrigin === "licensed"
                                ? "Licensed design"
                                : "Fan-inspired design",
                        },
                        { label: "SKU", value: activeProduct.sku },
                        {
                          label: "Edition",
                          value: activeProduct.isNew
                            ? "New release"
                            : "Core collection",
                        },
                        {
                          label: "Fulfilment",
                          value: activeProduct.shippingBadge,
                        },
                  ]
                  ).map((spec, i) => {
                    const SpecIcon = [IconPrinter, IconTag, IconSparkles, IconTag, IconSparkles, IconPackage][i] ?? IconTag;
                    return (
                    <div
                      key={i}
                      className="group flex items-center justify-between gap-4 border-b border-white/10 py-3 text-xs font-mono transition-colors duration-300 hover:border-[#e34d2e]/60"
                    >
                      <span className="flex items-center gap-2 text-white/55 transition-colors duration-300 group-hover:text-white"><SpecIcon size={15} className="text-[#e34d2e] transition-transform duration-300 group-hover:scale-110" />{spec.label}</span>
                      <span className="text-right font-medium text-white transition-transform duration-300 group-hover:-translate-x-1">
                        {spec.value}
                      </span>
                    </div>
                    );
                  })}
                </div>
              )}

              {activeTab === "shipping" && (
                <div className="space-y-4 text-xs md:text-sm text-white/70 font-light leading-relaxed">
                  <p className="flex gap-3 transition-colors duration-300 hover:text-white"><IconPackage size={18} className="mt-0.5 shrink-0 text-[#e34d2e]" />
                    All ZeroCraft orders are carefully packaged in custom
                    shock-absorbing recycled cardboard tubes or reinforced
                    wooden edge boxes to prevent damage during transport.
                  </p>
                  <p className="flex gap-3 transition-colors duration-300 hover:text-white"><IconRefresh size={18} className="mt-0.5 shrink-0 text-[#f5b544]" />
                    Standard delivery takes 3-5 business days. Express overnight
                    courier options are available at checkout.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Products Recommendations */}
        {relatedProducts.length > 0 && (
          <div className="my-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-4xl font-secondary font-bold tracking-tight text-[#151311]">
                You May Also Like
              </h2>
              <Link
                href={`/store/category/${activeProduct.categorySlug}`}
                className="text-xs font-mono text-[#e34d2e] hover:underline"
              >
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
