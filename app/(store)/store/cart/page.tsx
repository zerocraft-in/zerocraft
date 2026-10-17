"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Breadcrumbs from "@/components/store/Breadcrumbs";
import { useStore } from "@/lib/store/useStore";
import { formatCatalogPrice } from "@/lib/commerce/format";
import { useCartValidation } from "@/lib/store/useCartValidation";
import { IconTrash, IconShoppingBag, IconTag, IconGift, IconArrowRight, IconTruck, IconShieldCheck } from "@/components/store/StoreIcon";
import { toast } from "sonner";

export default function CartPage() {
  const {
    cart,
    updateQuantity,
    removeFromCart,
    clearCart,
    couponCode,
    discountPercentage,
    applyCoupon,
    giftNote,
    setGiftNote,
  } = useStore();
  const { validation, isValidating, error: validationError } = useCartValidation(cart);

  const [inputCoupon, setInputCoupon] = useState("");

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discountAmount = (subtotal * discountPercentage) / 100;
  const shippingCost = subtotal > 100 || subtotal === 0 ? 0 : 9.0;
  const tax = (subtotal - discountAmount) * 0.08;
  const grandTotal = Math.max(0, subtotal - discountAmount + shippingCost + tax);
  const canCheckout = Boolean(cart.length > 0 && !isValidating && validation?.valid);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCoupon) return;
    const res = applyCoupon(inputCoupon);
    if (res.success) {
      toast.success(res.message);
      setInputCoupon("");
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="py-8 min-h-screen">
      <div className="container-site">
        <Breadcrumbs items={[{ label: "Shopping Cart" }]} />

        <div className="my-8 pb-6 border-b border-neutral-200 dark:border-neutral-800 flex items-end justify-between">
          <div>
            <span className="text-label text-lime-600 dark:text-lime-400 mb-2 block">
              Shopping Bag
            </span>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Your Cart ({cart.reduce((s, i) => s + i.quantity, 0)} items)
            </h1>
          </div>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs font-mono text-neutral-400 hover:text-rose-500 transition-colors flex items-center gap-1"
            >
              <IconTrash size={16} /> Empty Cart
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="p-16 text-center rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 my-12">
            <IconShoppingBag size={48} className="mx-auto mb-4 text-neutral-300 dark:text-neutral-700" />
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
              Your cart is currently empty
            </h2>
            <p className="text-xs text-neutral-500 font-light max-w-sm mx-auto mb-6">
              Looks like you haven&apos;t added any handcrafted posters, frames, or custom gifts to your bag yet.
            </p>
            <Link
              href="/store/shop"
              className="inline-flex px-8 py-4 rounded-2xl bg-lime-500 text-black font-semibold text-xs uppercase tracking-wider hover:bg-lime-400 transition-colors"
            >
              Explore Shop Catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 my-8">
            {/* Left Items Table Column (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="space-y-4">
                {cart.map((item) => (
                  <div
                    key={item.lineId}
                    className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="relative h-24 w-24 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0">
                        <Image
                          src={item.product.images[0]}
                          alt={item.product.title}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/store/product/${item.product.id}`}
                          className="text-base font-bold text-neutral-900 dark:text-white line-clamp-1 hover:text-lime-600 dark:hover:text-lime-400 transition-colors"
                        >
                          {item.product.title}
                        </Link>
                        <p className="text-xs text-neutral-400 font-mono mt-0.5">
                          Category: {item.product.category}
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs font-mono text-neutral-500 mt-2">
                          {item.selectedColor && (
                            <span className="bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-md">
                              Color: {item.selectedColor}
                            </span>
                          )}
                          {item.selectedSize && (
                            <span className="bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-md">
                              Size: {item.selectedSize}
                            </span>
                          )}
                          {item.selectedVariantLabel && (
                            <span className="bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-md">
                              Variant: {item.selectedVariantLabel}
                            </span>
                          )}
                          {item.customizationReference && (
                            <span className="bg-lime-100 dark:bg-lime-950/40 px-2.5 py-1 rounded-md">
                              Custom artwork attached
                            </span>
                          )}
                          {validation?.lines.find((line) => line.lineId === item.lineId)?.errors.map((lineError) => (
                            <span key={lineError.code} className="basis-full text-rose-600 dark:text-rose-400">
                              {lineError.message}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Quantity & Price Controls */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800">
                      <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-xl px-2 py-1 bg-neutral-50 dark:bg-neutral-950">
                        <button
                          onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center text-xs font-bold text-neutral-500 hover:text-black dark:hover:text-white"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-mono font-semibold text-xs">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center text-xs font-bold text-neutral-500 hover:text-black dark:hover:text-white"
                        >
                          +
                        </button>
                      </div>

                      <span className="text-base font-bold font-mono text-neutral-900 dark:text-white w-24 text-right">
                        {formatCatalogPrice(item.product.price * item.quantity, item.product.currency)}
                      </span>

                      <button
                        onClick={() => removeFromCart(item.lineId)}
                        className="text-neutral-400 hover:text-rose-500 transition-colors p-1"
                        aria-label="Remove item"
                      >
                        <IconTrash size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {(isValidating || validationError || (validation && !validation.valid)) && (
                <div className="p-4 rounded-2xl border border-amber-300/60 bg-amber-50 text-xs text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/20 dark:text-amber-300">
                  {isValidating ? "Checking live product availability…" : validationError || "Some cart lines need attention before checkout."}
                </div>
              )}
              {/* Gift Note Box */}
              <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <IconGift size={18} className="text-lime-500" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                    Add Complimentary Gift Note
                  </h3>
                </div>
                <textarea
                  rows={3}
                  value={giftNote}
                  onChange={(e) => setGiftNote(e.target.value)}
                  placeholder="Enter custom gift message to be hand-written on silk card insert..."
                  className="w-full p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-lime-400 resize-none font-light"
                />
              </div>
            </div>

            {/* Right Summary Column (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-lg space-y-6 sticky top-28">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white uppercase tracking-wider font-mono pb-4 border-b border-neutral-200 dark:border-neutral-800">
                  Order Summary
                </h2>

                {/* Promo Coupon Form */}
                <form onSubmit={handleApplyCoupon} className="space-y-2">
                  <label className="text-[11px] font-mono uppercase text-neutral-400">
                    Promo Code (Try CRAFT10)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <IconTag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        value={inputCoupon}
                        onChange={(e) => setInputCoupon(e.target.value)}
                        placeholder="CRAFT10"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 uppercase font-mono text-xs focus:outline-none focus:border-lime-400"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black font-mono text-xs font-semibold"
                    >
                      Apply
                    </button>
                  </div>
                </form>

                {/* Cost Breakdown */}
                <div className="space-y-3 font-mono text-xs text-neutral-600 dark:text-neutral-300">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-neutral-900 dark:text-white">{formatCatalogPrice(subtotal, cart[0]?.product.currency)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Discount ({couponCode} -{discountPercentage}%)</span>
                      <span>-{formatCatalogPrice(discountAmount, cart[0]?.product.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>{shippingCost === 0 ? "FREE" : formatCatalogPrice(shippingCost, cart[0]?.product.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Tax (8%)</span>
                    <span>{formatCatalogPrice(tax, cart[0]?.product.currency)}</span>
                  </div>
                  <div className="flex justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800 text-base font-bold text-neutral-900 dark:text-white">
                    <span>Order Total</span>
                    <span className="text-xl text-lime-600 dark:text-lime-400">{formatCatalogPrice(grandTotal, cart[0]?.product.currency)}</span>
                  </div>
                </div>

                {/* Checkout CTA */}
                <Link
                  href="/store/checkout"
                  aria-disabled={!canCheckout}
                  onClick={(event) => {
                    if (!canCheckout) event.preventDefault();
                  }}
                  className={`w-full py-4 px-6 rounded-2xl font-bold text-xs uppercase tracking-wider text-center transition-colors flex items-center justify-center gap-2 shadow-lg ${canCheckout ? "bg-lime-500 text-black hover:bg-lime-400" : "cursor-not-allowed bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500"}`}
                >
                  {isValidating ? "Checking availability..." : "Proceed to Checkout"} <IconArrowRight size={18} />
                </Link>

                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-center gap-4 text-[11px] font-mono text-neutral-400">
                  <span className="flex items-center gap-1"><IconTruck size={14} /> Express Shipping</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><IconShieldCheck size={14} /> Secure Checkout</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
