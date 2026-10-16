"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { IconX, IconTrash, IconShoppingBag, IconTag, IconArrowRight, IconCheck } from "@tabler/icons-react";
import { useStore } from "@/lib/store/useStore";
import { formatCatalogPrice } from "@/lib/commerce/format";
import { useCartValidation } from "@/lib/store/useCartValidation";

export default function CartDrawer() {
  const {
    cart,
    cartDrawerOpen,
    toggleCartDrawer,
    updateQuantity,
    removeFromCart,
    couponCode,
    discountPercentage,
    applyCoupon,
  } = useStore();
  const { validation, isValidating, error: validationError } = useCartValidation(cart);

  const [inputCoupon, setInputCoupon] = useState("");
  const [couponFeedback, setCouponFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const discountAmount = (subtotal * discountPercentage) / 100;
  const shipping = subtotal > 100 || subtotal === 0 ? 0 : 9.0;
  const tax = (subtotal - discountAmount) * 0.08;
  const total = Math.max(0, subtotal - discountAmount + shipping + tax);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCoupon) return;
    const res = applyCoupon(inputCoupon);
    setCouponFeedback(res);
    if (res.success) setInputCoupon("");
  };

  return (
    <AnimatePresence>
      {cartDrawerOpen && (
        <div className="fixed inset-0 z-[300] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => toggleCartDrawer(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md bg-white dark:bg-neutral-900 h-full shadow-2xl flex flex-col z-10 border-l border-neutral-200 dark:border-neutral-800"
          >
            {/* Header */}
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconShoppingBag size={22} className="text-lime-600 dark:text-lime-400" />
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Your Cart
                </h2>
                <span className="ml-2 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-mono font-semibold">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                </span>
              </div>
              <button
                onClick={() => toggleCartDrawer(false)}
                className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                <IconX size={20} />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500">
                  <IconShoppingBag size={48} className="mb-4 text-neutral-300 dark:text-neutral-700" />
                  <p className="text-base font-semibold mb-1 text-neutral-900 dark:text-white">Your cart is empty</p>
                  <p className="text-xs mb-6 max-w-xs font-light">Explore our handcrafted posters, photo frames, and customized gifts to start filling your space.</p>
                  <Link
                    href="/store/shop"
                    onClick={() => toggleCartDrawer(false)}
                    className="px-6 py-3 rounded-xl bg-black text-white dark:bg-white dark:text-black font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
                  >
                    Start Shopping
                  </Link>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.lineId}
                    className="flex gap-4 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800/60"
                  >
                    {/* Item Image */}
                    <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0">
                      <Image
                        src={item.product.images[0]}
                        alt={item.product.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>

                    {/* Item Metadata */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/store/product/${item.product.id}`}
                            onClick={() => toggleCartDrawer(false)}
                            className="font-medium text-sm text-neutral-900 dark:text-white line-clamp-1 hover:text-lime-600 dark:hover:text-lime-400 transition-colors"
                          >
                            {item.product.title}
                          </Link>
                          <button
                            onClick={() => removeFromCart(item.lineId)}
                            className="text-neutral-400 hover:text-rose-500 transition-colors p-1"
                          >
                            <IconTrash size={16} />
                          </button>
                        </div>

                        {/* Variants */}
                        <div className="flex flex-wrap gap-2 text-[11px] font-mono text-neutral-500 mt-0.5">
                          {item.selectedColor && <span>Color: {item.selectedColor}</span>}
                          {item.selectedSize && <span>• Size: {item.selectedSize}</span>}
                          {item.selectedVariantLabel && <span>• Variant: {item.selectedVariantLabel}</span>}
                          {item.customizationReference && <span className="text-lime-700 dark:text-lime-400">• Custom artwork attached</span>}
                          {validation?.lines.find((line) => line.lineId === item.lineId)?.errors.map((lineError) => (
                            <span key={lineError.code} className="basis-full text-rose-600 dark:text-rose-400">{lineError.message}</span>
                          ))}
                        </div>
                      </div>

                      {/* Quantity & Price */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-200/50 dark:border-neutral-700/40">
                        <div className="flex items-center border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 px-1">
                          <button
                            onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-xs font-mono font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center text-xs font-bold"
                          >
                            +
                          </button>
                        </div>

                        <span className="text-sm font-semibold font-mono text-neutral-900 dark:text-white">
                          {formatCatalogPrice(item.product.price * item.quantity, item.product.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-950/80 space-y-4">
                {(isValidating || validationError || (validation && !validation.valid)) && (
                  <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/20 dark:text-amber-300">
                    {isValidating ? "Checking live product availability…" : validationError || "Some cart lines need attention before checkout."}
                  </div>
                )}
                {/* Coupon Input */}
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <IconTag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      value={inputCoupon}
                      onChange={(e) => setInputCoupon(e.target.value)}
                      placeholder="Coupon (e.g. CRAFT10)"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 uppercase font-mono placeholder:normal-case placeholder:font-sans focus:outline-none focus:border-lime-400"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black text-xs font-mono font-semibold"
                  >
                    Apply
                  </button>
                </form>

                {/* Coupon Feedback */}
                {couponFeedback && (
                  <p className={`text-[11px] font-mono ${couponFeedback.success ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                    {couponFeedback.message}
                  </p>
                )}

                {/* Subtotal & Totals */}
                <div className="space-y-1.5 text-xs font-mono text-neutral-600 dark:text-neutral-400">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-neutral-900 dark:text-white font-semibold">{formatCatalogPrice(subtotal, cart[0]?.product.currency)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Discount ({couponCode} -{discountPercentage}%)</span>
                      <span>-{formatCatalogPrice(discountAmount, cart[0]?.product.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Est. Shipping</span>
                    <span>{shipping === 0 ? "FREE" : formatCatalogPrice(shipping, cart[0]?.product.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. Tax (8%)</span>
                    <span>{formatCatalogPrice(tax, cart[0]?.product.currency)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800 text-sm font-bold text-neutral-900 dark:text-white">
                    <span>Total</span>
                    <span className="text-base text-lime-600 dark:text-lime-400">{formatCatalogPrice(total, cart[0]?.product.currency)}</span>
                  </div>
                </div>

                {/* Checkout & View Cart CTAs */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Link
                    href="/store/cart"
                    onClick={() => toggleCartDrawer(false)}
                    className="py-3 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-center font-semibold text-xs uppercase tracking-wider hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    View Cart
                  </Link>
                  <Link
                    href="/store/checkout"
                    onClick={() => toggleCartDrawer(false)}
                    className="py-3 px-4 rounded-xl bg-lime-500 text-black font-semibold text-xs uppercase tracking-wider text-center hover:bg-lime-400 transition-colors flex items-center justify-center gap-1.5 shadow-md"
                  >
                    Checkout <IconArrowRight size={16} />
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
