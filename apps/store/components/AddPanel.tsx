'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Icon from './Icon';
import { useCart } from './CartProvider';
import type { Product } from '@/lib/products';
import type { CatalogProduct } from '@/lib/commerce/catalog';

type AddableProduct = Product | CatalogProduct;

export default function AddPanel({ product }: { product: AddableProduct }) {
  const { add } = useCart();
  const router = useRouter();
  const [size, setSize] = useState(product.sizes.length === 1 ? product.sizes[0] : '');
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState(false);
  const [pin, setPin] = useState('');
  const [eta, setEta] = useState('');
  const categorySlug = 'categorySlug' in product ? product.categorySlug : product.cat;
  const isPoster = categorySlug === 'posters' || categorySlug === 'frames';

  const guard = () => { if (!size) { setErr(true); return false; } return true; };
  const check = (e: React.FormEvent) => {
    e.preventDefault();
    setEta(/^\d{6}$/.test(pin) ? 'Delivery in 3–6 days. Cash on delivery not available.' : 'Enter a 6-digit PIN code.');
  };

  return (
    <div id="product-add-panel" className="product-add-panel addp" data-product-slug={product.slug}>
      <div className="opt-h"><b>{isPoster ? 'Choose size' : 'Select size'}</b>{err && <span className="err" role="alert">Pick a size first</span>}</div>
      <div id="product-size-options" className="sizes" role="radiogroup" aria-label="Size">
        {product.sizes.map((s) => (
          <button type="button" key={s} role="radio" aria-checked={size === s} className={`size ${size === s ? 'on' : ''}`} onClick={() => { setSize(s); setErr(false); }}>{s}</button>
        ))}
      </div>
      <div className="buy-row">
        <div className="qty lg" role="group" aria-label="Quantity">
          <button type="button" aria-label="Decrease" onClick={() => setQty(Math.max(1, qty - 1))}><Icon name="minus" size={16} /></button>
          <span>{qty}</span>
          <button type="button" aria-label="Increase" onClick={() => setQty(Math.min(10, qty + 1))}><Icon name="plus" size={16} /></button>
        </div>
        <button className="btn grow" onClick={() => guard() && add(product.slug, size, qty)}><Icon name="bag" /> Add to cart</button>
      </div>
      <button className="btn k block" onClick={() => { if (guard()) { add(product.slug, size, qty, false); router.push('/cart'); } }}>Buy now</button>
      <form className="pin" onSubmit={check}>
        <label className="mono" htmlFor="pin"><Icon name="pin" size={16} /> Check delivery</label>
        <div><input id="pin" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN code" /><button className="btn o sm" type="submit">Check</button></div>
        {eta && <p className="small" role="status">{eta}</p>}
      </form>
    </div>
  );
}
