'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import Icon from './Icon';
import { ProductTile, Clap } from './Graphics';
import { useCart } from './CartProvider';
import { FREE_SHIP, getProduct, inr } from '@/lib/products';

export function Progress({ amount }: { amount: number }) {
  const left = Math.max(0, FREE_SHIP - amount);
  return (
    <div className="ship">
      <div className="mono">{left === 0 ? 'Free shipping unlocked' : `Add ${inr(left)} more for free shipping`}</div>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min(100, (amount / FREE_SHIP) * 100)}%` }} /></div>
    </div>
  );
}

export default function CartDrawer() {
  const { open, setOpen, lines, setQty, remove, subtotal, discount } = useCart();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, setOpen]);

  return (
    <div id="cart-drawer" className={`drawer ${open ? 'open' : ''}`} data-state={open ? 'open' : 'closed'} aria-hidden={!open}>
      <div className="scrim" onClick={() => setOpen(false)} />
      <aside className="panel" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
        <div className="panel-h">
          <h2 id="cart-drawer-title">Your cart</h2>
          <button type="button" className="iconbtn" aria-label="Close cart" onClick={() => setOpen(false)}><Icon name="close" /></button>
        </div>
        {lines.length === 0 ? (
          <div className="empty">
            <Clap style={{ width: 120 }} />
            <p>Nothing in the cart yet. Pick a poster or a tee to start your first show.</p>
            <Link className="btn" href="/shop" onClick={() => setOpen(false)}>Shop the drop</Link>
          </div>
        ) : (
          <>
            <Progress amount={subtotal - discount} />
            <ul className="lines">
              {lines.map((l) => {
                const p = getProduct(l.slug);
                const title = p?.name ?? l.product?.title;
                const price = p?.price ?? l.product?.price ?? 0;
                if (!title) return null;
                return (
                  <li key={l.slug + l.size} className="line">
                    <Link href={`/product/${l.slug}`} onClick={() => setOpen(false)} className="thumb">
                      {p ? <ProductTile art={p.art} /> : l.product?.image ? <img src={l.product.image} alt="" /> : null}
                    </Link>
                    <div className="li-body">
                      <b>{title}</b>
                      <span className="mono muted">Size {l.size}</span>
                      <div className="li-row">
                        <div className="qty" role="group" aria-label={`Quantity for ${title}`}>
                          <button aria-label="Decrease" onClick={() => setQty(l.slug, l.size, l.qty - 1)}><Icon name="minus" size={14} /></button>
                          <span>{l.qty}</span>
                          <button aria-label="Increase" onClick={() => setQty(l.slug, l.size, l.qty + 1)}><Icon name="plus" size={14} /></button>
                        </div>
                        <b>{inr(price * l.qty)}</b>
                      </div>
                    </div>
                    <button className="rm" aria-label={`Remove ${title}`} onClick={() => remove(l.slug, l.size)}><Icon name="trash" size={18} /></button>
                  </li>
                );
              })}
            </ul>
            <div className="panel-f">
              <div className="sum-row"><span>Subtotal</span><b>{inr(subtotal)}</b></div>
              <p className="muted small">Shipping and coupon are calculated in the cart.</p>
              <button type="button" className="btn block" onClick={() => alert('Connect your payment gateway (Razorpay or Stripe) here.')}>Checkout Â· {inr(subtotal)}</button>
              <Link className="btn k block" href="/cart" onClick={() => setOpen(false)}>View cart</Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
