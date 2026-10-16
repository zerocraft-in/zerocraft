"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Breadcrumbs from "@/components/store/Breadcrumbs";
import { useStore } from "@/lib/store/useStore";
import { formatCatalogPrice } from "@/lib/commerce/format";
import { useCartValidation } from "@/lib/store/useCartValidation";
import { toast } from "sonner";
import {
  IconTruck,
  IconShieldCheck,
  IconCash,
} from "@tabler/icons-react";

const countryCode = (value: string) => {
  const normalized = value.trim().toLowerCase();
  const aliases: Record<string, string> = {
    india: "IN",
    ind: "IN",
    "united states": "US",
    usa: "US",
    "united kingdom": "GB",
    uk: "GB",
    canada: "CA",
    australia: "AU",
    singapore: "SG",
    uae: "AE",
    "united arab emirates": "AE",
  };
  if (aliases[normalized]) return aliases[normalized];
  return /^[a-z]{2,3}$/i.test(value.trim()) ? value.trim().toUpperCase() : "IN";
};

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, clearCart, couponCode, discountPercentage, userProfile, addOrder } = useStore();
  const { validation, isValidating, error: validationError } = useCartValidation(cart);

  const [loading, setLoading] = useState(false);
  const [idempotencyKey] = useState(() => `checkout-${crypto.randomUUID()}`);
  const [deliveryMethod, setDeliveryMethod] = useState<"standard" | "express" | "overnight">("standard");

  const [formData, setFormData] = useState({
    fullName: userProfile.name,
    email: userProfile.email,
    phone: userProfile.phone,
    street: userProfile.address.street,
    city: userProfile.address.city,
    state: userProfile.address.state,
    postalCode: userProfile.address.postalCode,
    country: countryCode(userProfile.address.country || "IN"),
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discountAmount = (subtotal * discountPercentage) / 100;
  
  let deliveryFee = 0;
  if (deliveryMethod === "standard") deliveryFee = subtotal > 100 ? 0 : 9.0;
  if (deliveryMethod === "express") deliveryFee = 15.0;
  if (deliveryMethod === "overnight") deliveryFee = 25.0;

  const tax = (subtotal - discountAmount) * 0.08;
  const grandTotal = Math.max(0, subtotal - discountAmount + deliveryFee + tax);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error("Your cart is empty!");
      return;
    }
    if (isValidating || !validation) {
      toast.error("Please wait while we check the live catalog.");
      return;
    }
    if (!validation.valid) {
      toast.error(validationError || "Resolve the unavailable cart lines before continuing.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/store/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey,
          address: { fullName: formData.fullName, street: formData.street, city: formData.city, state: formData.state, postalCode: formData.postalCode, country: formData.country, phone: formData.phone },
          items: cart.map((item) => ({
            productId: item.product.id,
            ...(item.selectedVariantId ? { variantId: item.selectedVariantId } : {}),
            quantity: item.quantity,
            ...(item.selectedColor?.trim() ? { color: item.selectedColor.trim() } : {}),
            ...(item.selectedSize?.trim() ? { size: item.selectedSize.trim() } : {}),
            ...(item.customizationReference?.trim() ? { customizationReference: item.customizationReference.trim() } : {}),
          })),
          delivery: deliveryMethod, paymentMethod: "cod",
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.order) throw new Error(result.error || "The order could not be saved.");
      const saved = result.order;
      addOrder({
        id: saved.id, orderNumber: saved.order_number,
        date: new Date(saved.created_at).toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" }),
        status: "Processing", timeline: [
          { step: "Order request received", timestamp: "Just now", completed: true },
          { step: "Studio confirmation", timestamp: "Pending", completed: false },
          { step: "Crafting & Packaging", timestamp: "Pending", completed: false },
          { step: "Shipped", timestamp: "Pending", completed: false },
          { step: "Delivered", timestamp: "Pending", completed: false },
        ],
        items: saved.items.map((item: { productId: string; title: string; image?: string; price?: number; unitPrice?: number; quantity: number; color?: string; size?: string }, index: number) => ({ ...item, price: item.price ?? item.unitPrice ?? 0, image: item.image ?? "", id: `${saved.id}-${index}` })),
        subtotal: saved.subtotal, discount: saved.discount, shippingFee: saved.shipping_fee, tax: saved.tax, total: saved.total,
        shippingAddress: { fullName: formData.fullName, street: formData.street, city: formData.city, state: formData.state, postalCode: formData.postalCode, country: formData.country, phone: formData.phone },
        paymentMethod: "Cash on Delivery — unpaid",
      });
      clearCart();
      toast.success("Order request saved. Payment is due on delivery.");
      router.push(`/store/order-success?orderId=${encodeURIComponent(saved.order_number)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The order could not be saved.");
    } finally { setLoading(false); }
  };

  return (
    <div className="py-8 min-h-screen">
      <div className="container-site">
        <Breadcrumbs
          items={[
            { label: "Cart", href: "/store/cart" },
            { label: "Fast checkout" },
          ]}
        />

        <div className="my-8 pb-6 border-b border-neutral-200 dark:border-neutral-800">
          <span className="text-label text-lime-600 dark:text-lime-400 mb-2 block">
            Fast checkout
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Complete your order in one step
          </h1>
        </div>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-12 my-8">
          {/* Left Column - Shipping & Payment (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            {/* Step 1: Shipping Address */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
                <h2 className="text-base font-bold text-neutral-900 dark:text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-bold">1</span>
                  Shipping Address
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-neutral-400 uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-lime-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase">Email Address</label>
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-lime-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase">Phone Number</label>
                  <input
                    type="tel"
                    required
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-lime-400"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-neutral-400 uppercase">Street Address</label>
                  <input
                    type="text"
                    required
                    name="street"
                    value={formData.street}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-lime-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase">City</label>
                  <input
                    type="text"
                    required
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-lime-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase">State / Province</label>
                  <input
                    type="text"
                    required
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-lime-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase">Postal Code</label>
                  <input
                    type="text"
                    required
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-lime-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase" htmlFor="checkout-country">Country</label>
                  <select
                    id="checkout-country"
                    required
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-lime-400"
                  >
                    <option value="IN">India</option>
                    <option value="US">United States</option>
                    <option value="GB">United Kingdom</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="SG">Singapore</option>
                    <option value="AE">United Arab Emirates</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: Delivery Option */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white font-mono uppercase tracking-wider flex items-center gap-2 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-bold">2</span>
                Delivery Speed
              </h2>

              <div className="space-y-3">
                <label
                  onClick={() => setDeliveryMethod("standard")}
                  className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                    deliveryMethod === "standard"
                      ? "border-lime-500 bg-lime-500/10 text-neutral-900 dark:text-white"
                      : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconTruck size={20} className="text-lime-500" />
                    <div>
                      <h4 className="text-xs font-mono font-bold">Standard Delivery (3-5 Days)</h4>
                      <p className="text-[11px] text-neutral-500 font-light">Dispatched in reinforced tubes</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold">{subtotal > 100 ? "FREE" : formatCatalogPrice(9, cart[0]?.product.currency)}</span>
                </label>

                <label
                  onClick={() => setDeliveryMethod("express")}
                  className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                    deliveryMethod === "express"
                      ? "border-lime-500 bg-lime-500/10 text-neutral-900 dark:text-white"
                      : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconTruck size={20} className="text-lime-500" />
                    <div>
                      <h4 className="text-xs font-mono font-bold">Express Courier (1-2 Days)</h4>
                      <p className="text-[11px] text-neutral-500 font-light">Priority dispatch & live tracking</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold">{formatCatalogPrice(15, cart[0]?.product.currency)}</span>
                </label>

                <label
                  onClick={() => setDeliveryMethod("overnight")}
                  className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                    deliveryMethod === "overnight"
                      ? "border-lime-500 bg-lime-500/10 text-neutral-900 dark:text-white"
                      : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconTruck size={20} className="text-lime-500" />
                    <div>
                      <h4 className="text-xs font-mono font-bold">Next Day Priority Overnight</h4>
                      <p className="text-[11px] text-neutral-500 font-light">Guaranteed next morning arrival</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold">{formatCatalogPrice(25, cart[0]?.product.currency)}</span>
                </label>
              </div>
            </div>

            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 space-y-4">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white font-mono uppercase tracking-wider flex items-center gap-2 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-bold">3</span>
                Payment on delivery
              </h2>
              <p className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300"><IconCash size={22} aria-hidden="true" /> Cash on Delivery</p>
              <p className="text-xs leading-relaxed text-neutral-500">No payment is collected on this website. Your order request will be reviewed before fulfillment.</p>
            </div>
          </div>
          {/* Right Order Summary Column (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xl space-y-6 sticky top-28">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white font-mono uppercase tracking-wider pb-4 border-b border-neutral-200 dark:border-neutral-800">
                Order Review ({cart.length} items)
              </h2>
              {(isValidating || validationError || (validation && !validation.valid)) && (
                <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/20 dark:text-amber-300">
                  {isValidating ? "Checking live product availability…" : validationError || "Some cart lines need attention before checkout."}
                </div>
              )}

              {/* Items List Mini */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1 no-scrollbar">
                {cart.map((item) => (
                  <div key={item.lineId} className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0">
                        <Image src={item.product.images[0]} alt={item.product.title} fill sizes="40px" className="object-cover" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-neutral-900 dark:text-white line-clamp-1">{item.product.title}</h4>
                        <span className="text-[10px] text-neutral-400">Qty: {item.quantity}{item.selectedVariantLabel ? ` · ${item.selectedVariantLabel}` : ""}</span>
                      </div>
                    </div>
                    <span className="font-bold text-neutral-900 dark:text-white">{formatCatalogPrice(item.product.price * item.quantity, item.product.currency)}</span>
                  </div>
                ))}
              </div>

              {/* Cost Totals */}
              <div className="space-y-2 pt-4 border-t border-neutral-200 dark:border-neutral-800 font-mono text-xs text-neutral-600 dark:text-neutral-300">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">{formatCatalogPrice(subtotal, cart[0]?.product.currency)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount ({couponCode})</span>
                    <span>-{formatCatalogPrice(discountAmount, cart[0]?.product.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Speed</span>
                  <span>{deliveryFee === 0 ? "FREE" : formatCatalogPrice(deliveryFee, cart[0]?.product.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (8%)</span>
                  <span>{formatCatalogPrice(tax, cart[0]?.product.currency)}</span>
                </div>
                <div className="flex justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800 text-lg font-bold text-neutral-900 dark:text-white">
                  <span>Total Amount</span>
                  <span className="text-xl text-lime-600 dark:text-lime-400">{formatCatalogPrice(grandTotal, cart[0]?.product.currency)}</span>
                </div>
              </div>

              {/* Place Order CTA Button */}
              <button
                type="submit"
                disabled={loading || cart.length === 0}
                className="w-full py-4 px-6 rounded-2xl bg-lime-500 text-black font-bold text-xs uppercase tracking-wider text-center hover:bg-lime-400 transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2 font-mono">
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Saving order request...
                  </span>
                ) : (
                  <>
                    <IconCash size={16} /> Request order · {formatCatalogPrice(grandTotal, cart[0]?.product.currency)} due on delivery
                  </>
                )}
              </button>

              <div className="text-center font-mono text-[11px] text-neutral-400 pt-2 flex items-center justify-center gap-1">
                <IconShieldCheck size={14} className="text-emerald-500" />
                256-Bit Encrypted Secure SSL Checkout
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
