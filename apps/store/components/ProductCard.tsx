import Link from 'next/link';
import Icon from './Icon';
import { ProductTile } from './Graphics';
import { QuickAdd } from './ProductBits';
import { inr, pct, type Product } from '@/lib/products';

export default function ProductCard({ p }: { p: Product }) {
  return <article id={`product-card-${p.slug}`} className="product-card" data-product-slug={p.slug} aria-label={p.name}>
    <div className="product-card__media">
      <Link href={`/product/${p.slug}`} className="product-card__image-link" aria-label={`View ${p.name}`}><ProductTile art={p.art} /></Link>
      {p.badge && <span className={`product-card__badge ${p.badge.startsWith('-') || p.badge.startsWith('SAVE') ? 'product-card__badge--sale' : ''}`} data-badge={p.badge}>{p.badge}</span>}
      <QuickAdd product={p} />
    </div>
    <span className="mono muted" data-product-category>{p.cat === 'bundles' ? 'Fan pack' : p.cat}</span>
    <Link href={`/product/${p.slug}`} className="product-card__name">{p.name}</Link>
    <div className="product-card__price" data-product-price>{inr(p.price)} <s>{inr(p.mrp)}</s><span>{pct(p)}% OFF</span></div>
    <span className="product-card__rating" aria-label={`${p.rating} out of 5 stars, ${p.reviews} reviews`}><Icon name="star" size={12} />{p.rating} · {p.reviews}</span>
  </article>;
}
