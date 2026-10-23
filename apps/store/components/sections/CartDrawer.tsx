"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Art from "./Art";
import { FREE_SHIPPING_ABOVE } from "@/data/store";
import { R, defaultSize, unitPrice } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function CartDrawer() {
  const { catalog: products, items, cartOpen, quick, closeAll, subtotal, discount, total, inc, dec, remove, add, applyCoupon, notify } = useStore();
  const router = useRouter();
  const [code, setCode] = useState("");
  const ids = items.map((i) => i.id);
  const rec = products.filter((p) => !ids.includes(p.id) && p.pr < 900).slice(0, 2);
  const left = FREE_SHIPPING_ABOVE - total;
  return (
    <>
      <div className={"storefront-overlay" + (cartOpen || quick !== null ? " is-active" : "")} onClick={closeAll} />
      <aside className={"cart-drawer" + (cartOpen ? " is-active" : "")} aria-hidden={!cartOpen} aria-label="Shopping cart">
        <h3 className="storefront-display">Your cart <button onClick={closeAll} aria-label="Close cart">×</button></h3>
        <div className="cart-shipping-progress"><div>{left <= 0 ? "✓ Free shipping unlocked" : <>Add <b>{R(left)}</b> more for free shipping</>}</div><i><b style={{ width: Math.min(100, (total / FREE_SHIPPING_ABOVE) * 100) + "%" }} /></i></div>
        <div id="cart-drawer-items">
          {items.length === 0 && <p style={{ color: "var(--mute)", padding: "30px 0" }}>Your cart is empty. Pick a scene.</p>}
          {items.map((i, k) => { const p = products[i.id]; return (
            <div className="cart-item" key={`${i.id}-${i.size}-${i.bundle}`}>
              <div className="cart-item__thumbnail"><Art p={p} k="t" /></div>
              <div>
                <b>{p.n}</b>{i.size && <span style={{ color: "var(--mute)" }}>{i.size} </span>}{i.bundle && <span style={{ color: "var(--red)", fontWeight: 700 }}>Bundle −15%</span>}<br />
                <span className="quantity-control"><button onClick={() => dec(k)} aria-label="Decrease">−</button><span>{i.qty}</span><button onClick={() => inc(k)} aria-label="Increase">+</button></span>
              </div>
              <div><b>{R(unitPrice(p.pr, i.bundle) * i.qty)}</b><button onClick={() => remove(k)} style={{ fontSize: 12, color: "var(--mute)", textDecoration: "underline" }}>Remove</button></div>
            </div>); })}
        </div>
        {items.length > 0 && rec.length > 0 && <div>
          <div className="storefront-kicker storefront-mono" style={{ margin: "14px 0 2px" }}>Pairs well with</div>
          {rec.map((p) => <div className="cart-item" key={p.id}><div className="cart-item__thumbnail"><Art p={p} k="u" /></div><div><b>{p.n}</b>{R(p.pr)}</div><button className="product-card__add" onClick={() => add(p.id, defaultSize(p))}>+ Add</button></div>)}
        </div>}
        <div className="coupon-form"><input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon: FIRSTSHOW10" aria-label="Coupon code" /><button onClick={() => applyCoupon(code)}>Apply</button></div>
        {discount > 0 && <div className="summary-row"><span>Coupon FIRSTSHOW10</span><span>−{R(discount)}</span></div>}
        <div className="summary-total"><span>Total</span><span>{R(total)}</span></div>
        <button className="storefront-button storefront-button--primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => { if (!items.length) return notify("Your cart is empty"); closeAll(); router.push("/checkout"); }}>Checkout</button>
      </aside>
    </>
  );
}
