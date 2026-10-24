"use client";
import Link from "next/link";
import { useState } from "react";
import Art from "./Art";
import { R, unitPrice } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function CheckoutClient() {
  const { catalog: products, items, subtotal, discount, total, clear, notify, ready } = useStore();
  const [order, setOrder] = useState("");
  const [f, setF] = useState({ name: "", phone: "", address: "", pin: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  if (order) return (
    <div className="checkout-state"><div className="storefront-kicker storefront-mono" style={{ justifyContent: "center" }}>Order confirmed</div><h1 className="storefront-display">Admit one ✓</h1>
      <p style={{ margin: "16px 0 28px", color: "var(--mute)" }}>Order {order} is booked. This is a demo checkout, no payment was taken.</p><Link href="/shop" className="storefront-button storefront-button--primary">Keep shopping</Link></div>
  );
  if (!ready) return (
    <div className="checkout-state" aria-live="polite">
      <span className="storefront-kicker storefront-mono">Restoring your cart</span>
      <p style={{ marginTop: 12, color: "var(--mute)" }}>Just a moment while we load your items.</p>
    </div>
  );
  if (!items.length) return (
    <div className="checkout-state"><h1 className="storefront-display">Your cart is empty</h1><p style={{ margin: "16px 0 28px", color: "var(--mute)" }}>Pick a scene first.</p><Link href="/shop" className="storefront-button storefront-button--primary">Browse the shop</Link></div>
  );
  const place = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name || !/^\d{10}$/.test(f.phone) || !f.address || !/^\d{6}$/.test(f.pin)) return notify("Fill name, 10-digit phone, address and 6-digit PIN");
    setOrder("PC-" + Date.now().toString().slice(-6)); clear(); // TODO: create order + payment (Razorpay / Stripe) here
  };
  return (
    <div className="checkout-layout">
      <form onSubmit={place} noValidate>
        <div className="storefront-kicker storefront-mono">Delivery details</div><h1 className="storefront-display" style={{ fontSize: "clamp(40px,6vw,76px)" }}>Checkout</h1>
        <div className="checkout-fields">
          <input placeholder="Full name" value={f.name} onChange={set("name")} aria-label="Full name" />
          <input placeholder="Phone (10 digits)" inputMode="numeric" value={f.phone} onChange={set("phone")} aria-label="Phone" />
          <textarea placeholder="Address" rows={3} value={f.address} onChange={set("address")} aria-label="Address" />
          <input placeholder="PIN code" inputMode="numeric" maxLength={6} value={f.pin} onChange={set("pin")} aria-label="PIN code" />
          <button className="storefront-button storefront-button--primary" style={{ justifyContent: "center" }}>Place order · {R(total)}</button>
        </div>
      </form>
      <aside className="checkout-summary">
        <div className="storefront-kicker storefront-mono">Order summary</div>
        {items.map((i) => { const p = products[i.id]; return (
          <div className="cart-item" key={`${i.id}-${i.size}-${i.bundle}`}>
            <div className="cart-item__thumbnail"><Art p={p} k="s" /></div>
            <div><b>{p.n}</b>{i.size} × {i.qty}</div><b>{R(unitPrice(p.pr, i.bundle) * i.qty)}</b>
          </div>); })}
        <div className="summary-row" style={{ color: "var(--ink)", marginTop: 10 }}><span>Subtotal</span><span>{R(subtotal)}</span></div>
        {discount > 0 && <div className="summary-row"><span>Coupon</span><span>−{R(discount)}</span></div>}
        <div className="summary-total"><span>Total</span><span>{R(total)}</span></div>
      </aside>
    </div>
  );
}
