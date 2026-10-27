'use client';
import Link from 'next/link';
import { useState } from 'react';
import Icon from './Icon';
import { Clap, ProductTile, Burst } from './Graphics';
import { Progress } from './CartDrawer';
import { useCart } from './CartProvider';
import { COUPON, getProduct, inr } from '@/lib/products';

export default function CartView() {
  const { lines, setQty, remove, subtotal, discount, shipping, total, coupon, applyCoupon, clearCoupon } = useCart();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');

  if (lines.length === 0)
    return (
      <div className="empty-s">
        <Clap style={{ width: 160 }} />
        <h1 className="h-md">Your cart is empty</h1>
        <p>Pick a poster or a tee to start your first show.</p>
        <Link className="btn" href="/shop">Shop the drop <Icon name="arrow" /></Link>
      </div>
    );

  return (
    <div className="cart-g">
      <div>
        <Progress amount={subtotal - discount} />
        <ul className="lines big">
          {lines.map((l) => {
            const p = getProduct(l.slug);
            const title = p?.name ?? l.product?.title;
            const price = p?.price ?? l.product?.price ?? 0;
            if (!title) return null;
            return (
              <li key={l.slug + l.size} className="line">
                <Link href={`/product/${l.slug}`} className="thumb">
                  {p ? <ProductTile art={p.art} /> : l.product?.image ? <img src={l.product.image} alt="" /> : null}
                </Link>
                <div className="li-body">
                  <Link href={`/product/${l.slug}`}><b>{title}</b></Link>
                  <span className="mono muted">Size {l.size}</span>
                  <span className="small muted">{inr(price)} each</span>
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
      </div>
      <aside className="tk summary" style={{ ['--pg' as string]: '#F0E2C3' }}>
        <h2>Order summary</h2>
        <form className="coupon" onSubmit={(e) => { e.preventDefault(); setMsg(applyCoupon(code) ? '10% off applied.' : 'That code is not valid.'); setCode(''); }}>
          <label className="mono" htmlFor="cp">Coupon code</label>
          <div><input id="cp" value={code} onChange={(e) => setCode(e.target.value)} placeholder={COUPON} /><button className="btn k sm" type="submit">Apply</button></div>
          {msg && <p className="small" role="status">{msg}</p>}
        </form>
        <dl className="sum">
          <div><dt>Subtotal</dt><dd>{inr(subtotal)}</dd></div>
          {coupon && <div className="green"><dt>{coupon} <button className="link" onClick={() => { clearCoupon(); setMsg(''); }}>Remove</button></dt><dd>-{inr(discount)}</dd></div>}
          <div><dt>Shipping</dt><dd>{shipping === 0 ? 'Free' : inr(shipping)}</dd></div>
          <div className="tot"><dt>Total</dt><dd>{inr(total)}</dd></div>
        </dl>
        <button className="btn block" onClick={() => alert('Connect your payment gateway (Razorpay or Stripe) here.')}>Checkout · {inr(total)}</button>
        <p className="small muted center">Secure UPI, cards and netbanking</p>
        <Burst className="sum-burst" fill="#C23B22" />
      </aside>
    </div>
  );
}
