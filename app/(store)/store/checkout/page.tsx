"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Breadcrumbs from "@/components/store/Breadcrumbs";
import { useStore } from "@/lib/store/useStore";
import { toast } from "sonner";
import {
  IconTruck,
  IconCreditCard,
  IconBrandApple,
  IconShieldCheck,
  IconCheck,
  IconLock,
  IconCash,
  IconDeviceMobile,
} from "@tabler/icons-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, clearCart, couponCode, discountPercentage, userProfile, addOrder } = useStore();

  const [loading, setLoading] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<"standard" | "express" | "overnight">("standard");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi" | "applepay" | "cod">("card");

  const [formData, setFormData] = useState({
    fullName: userProfile.name,
    email: userProfile.email,
    phone: userProfile.phone,
    street: userProfile.address.street,
    city: userProfile.address.city,
    state: userProfile.address.state,
    postalCode: userProfile.address.postalCode,
    country: userProfile.address.country,
    cardNumber: "4532 8920 1982 4920",
    cardExpiry: "08/29",
    cardCvc: "892",
    upiId: "julian@upi",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error("Your cart is empty!");
      return;
    }

    setLoading(true);

    const generatedOrderNumber = `ZC-${Math.floor(10000 + Math.random() * 90000)}`;

    setTimeout(() => {
      const newOrder = {
        id: `ord-${Date.now()}`,
        orderNumber: generatedOrderNumber,
        date: new Date().toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" }),
        status: "Processing" as const,
        timeline: [
          { step: "Order Placed", timestamp: "Just now", completed: true },
          { step: "Payment Confirmed", timestamp: "Just now", completed: true },
          { step: "Crafting & Packaging", timestamp: "Pending", completed: false },
          { step: "Shipped", timestamp: "Pending", completed: false },
          { step: "Delivered", timestamp: "Pending", completed: false },
        ],
        items: cart.map((item) => ({
          id: `item-${Math.random()}`,
          productId: item.product.id,
          title: item.product.title,
          image: item.product.images[0],
          price: item.product.price,
          quantity: item.quantity,
          color: item.selectedColor,
          size: item.selectedSize,
        })),
        subtotal,
        discount: discountAmount,
        shippingFee: deliveryFee,
        tax,
        total: grandTotal,
        shippingAddress: {
          fullName: formData.fullName,
          street: formData.street,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
          country: formData.country,
          phone: formData.phone,
        },
        paymentMethod:
          paymentMethod === "card"
            ? `Credit Card (•••• ${formData.cardNumber.slice(-4)})`
            : paymentMethod === "upi"
            ? `UPI (${formData.upiId})`
            : paymentMethod === "applepay"
            ? "Apple Pay"
            : "Cash on Delivery",
      };

      addOrder(newOrder);
      clearCart();
      setLoading(false);
      toast.success("Order placed successfully!");
      router.push(`/order-success?orderId=${newOrder.orderNumber}`);
    }, 1500);
  };

  return (
    <div className="py-8 min-h-screen">
      <div className="container-site">
        <Breadcrumbs
          items={[
            { label: "Cart", href: "/cart" },
            { label: "Checkout" },
          ]}
        />

        <div className="my-8 pb-6 border-b border-neutral-200 dark:border-neutral-800">
          <span className="text-label text-amber-600 dark:text-amber-400 mb-2 block">
            Express Checkout
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Complete Your Purchase
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
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      fullName: "Julian Vance",
                      email: "julian.vance@zerocraft.in",
                      phone: "+1 (555) 392-0192",
                      street: "742 Design Avenue, Suite 400",
                      city: "San Francisco",
                      state: "CA",
                      postalCode: "94107",
                      country: "United States",
                      cardNumber: "4532 8920 1982 4920",
                      cardExpiry: "08/29",
                      cardCvc: "892",
                      upiId: "julian@upi",
                    })
                  }
                  className="text-xs font-mono text-amber-600 dark:text-amber-400 underline"
                >
                  Pre-fill Demo Address
                </button>
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
                    className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-amber-400"
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
                    className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-amber-400"
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
                    className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-amber-400"
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
                    className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-amber-400"
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
                    className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-amber-400"
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
                    className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-amber-400"
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
                    className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase">Country</label>
                  <input
                    type="text"
                    required
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-amber-400"
                  />
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
                      ? "border-amber-500 bg-amber-500/10 text-neutral-900 dark:text-white"
                      : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconTruck size={20} className="text-amber-500" />
                    <div>
                      <h4 className="text-xs font-mono font-bold">Standard Delivery (3-5 Days)</h4>
                      <p className="text-[11px] text-neutral-500 font-light">Dispatched in reinforced tubes</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold">{subtotal > 100 ? "FREE" : "$9.00"}</span>
                </label>

                <label
                  onClick={() => setDeliveryMethod("express")}
                  className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                    deliveryMethod === "express"
                      ? "border-amber-500 bg-amber-500/10 text-neutral-900 dark:text-white"
                      : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconTruck size={20} className="text-amber-500" />
                    <div>
                      <h4 className="text-xs font-mono font-bold">Express Courier (1-2 Days)</h4>
                      <p className="text-[11px] text-neutral-500 font-light">Priority dispatch & live tracking</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold">$15.00</span>
                </label>

                <label
                  onClick={() => setDeliveryMethod("overnight")}
                  className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                    deliveryMethod === "overnight"
                      ? "border-amber-500 bg-amber-500/10 text-neutral-900 dark:text-white"
                      : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconTruck size={20} className="text-amber-500" />
                    <div>
                      <h4 className="text-xs font-mono font-bold">Next Day Priority Overnight</h4>
                      <p className="text-[11px] text-neutral-500 font-light">Guaranteed next morning arrival</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold">$25.00</span>
                </label>
              </div>
            </div>

            {/* Step 3: Payment Method */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs space-y-6">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white font-mono uppercase tracking-wider flex items-center gap-2 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-bold">3</span>
                Payment Method
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 text-xs font-mono transition-all ${
                    paymentMethod === "card"
                      ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-500"
                  }`}
                >
                  <IconCreditCard size={20} /> Credit Card
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("upi")}
                  className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 text-xs font-mono transition-all ${
                    paymentMethod === "upi"
                      ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-500"
                  }`}
                >
                  <IconDeviceMobile size={20} /> UPI Pay
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("applepay")}
                  className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 text-xs font-mono transition-all ${
                    paymentMethod === "applepay"
                      ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-500"
                  }`}
                >
                  <IconBrandApple size={20} /> Apple Pay
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cod")}
                  className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 text-xs font-mono transition-all ${
                    paymentMethod === "cod"
                      ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-500"
                  }`}
                >
                  <IconCash size={20} /> Cash on Delivery
                </button>
              </div>

              {/* Card Inputs */}
              {paymentMethod === "card" && (
                <div className="grid grid-cols-2 gap-4 text-xs font-mono pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="col-span-2 space-y-1">
                    <label className="text-neutral-400 uppercase">Card Number</label>
                    <input
                      type="text"
                      name="cardNumber"
                      value={formData.cardNumber}
                      onChange={handleInputChange}
                      className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-400 uppercase">Expiry Date</label>
                    <input
                      type="text"
                      name="cardExpiry"
                      value={formData.cardExpiry}
                      onChange={handleInputChange}
                      className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-400 uppercase">CVC / CVV</label>
                    <input
                      type="text"
                      name="cardCvc"
                      value={formData.cardCvc}
                      onChange={handleInputChange}
                      className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === "upi" && (
                <div className="space-y-1 text-xs font-mono pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <label className="text-neutral-400 uppercase">VPA / UPI ID</label>
                  <input
                    type="text"
                    name="upiId"
                    value={formData.upiId}
                    onChange={handleInputChange}
                    placeholder="username@upi"
                    className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Order Summary Column (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xl space-y-6 sticky top-28">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white font-mono uppercase tracking-wider pb-4 border-b border-neutral-200 dark:border-neutral-800">
                Order Review ({cart.length} items)
              </h2>

              {/* Items List Mini */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1 no-scrollbar">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0">
                        <Image src={item.product.images[0]} alt={item.product.title} fill sizes="40px" className="object-cover" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-neutral-900 dark:text-white line-clamp-1">{item.product.title}</h4>
                        <span className="text-[10px] text-neutral-400">Qty: {item.quantity}</span>
                      </div>
                    </div>
                    <span className="font-bold text-neutral-900 dark:text-white">${(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Cost Totals */}
              <div className="space-y-2 pt-4 border-t border-neutral-200 dark:border-neutral-800 font-mono text-xs text-neutral-600 dark:text-neutral-300">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">${subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount ({couponCode})</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Speed</span>
                  <span>{deliveryFee === 0 ? "FREE" : `$${deliveryFee.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800 text-lg font-bold text-neutral-900 dark:text-white">
                  <span>Total Amount</span>
                  <span className="text-xl text-amber-600 dark:text-amber-400">${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Place Order CTA Button */}
              <button
                type="submit"
                disabled={loading || cart.length === 0}
                className="w-full py-4 px-6 rounded-2xl bg-amber-500 text-black font-bold text-xs uppercase tracking-wider text-center hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2 font-mono">
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Processing Payment...
                  </span>
                ) : (
                  <>
                    <IconLock size={16} /> Place Order & Pay ${grandTotal.toFixed(2)}
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
