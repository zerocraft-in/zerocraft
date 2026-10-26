'use client';

import Link from 'next/link';
import Icon from './Icon';
import { useCart } from './CartProvider';
import type { CatalogProduct } from '@/lib/commerce/catalog';

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export default function CatalogProductCard({ product }: { product: CatalogProduct }) {
  const { add } = useCart();
  const size = product.sizes[0] ?? 'One size';
  const hasDiscount = product.originalPrice > product.price;
  const badge = product.isNew ? 'NEW' : hasDiscount ? `${Math.round((1 - product.price / product.originalPrice) * 100)}% OFF` : null;

  return (
    <article id={`catalog-product-${product.slug}`} className="product-card" data-product-id={product.id} data-product-slug={product.slug}>
      <div className="product-card__media">
        <Link href={`/product/${product.slug}`} className="product-card__image-link" aria-label={`View ${product.title}`}>
          <div className="pt catalog-product-card__image">
            <img src={product.images[0] ?? '/og-image.jpg'} alt={product.title} loading="lazy" />
          </div>
        </Link>
        {badge && <span className={`product-card__badge ${hasDiscount ? 'product-card__badge--sale' : ''}`} data-badge={badge}>{badge}</span>}
        <button type="button" className="product-card__quick-add" onClick={() => add(product.slug, size)} aria-label={`Quick add ${product.title}, size ${size}`} data-action="quick-add">
          <Icon name="bag" size={16} /> Quick add · {size}
        </button>
      </div>
      <span className="mono muted" data-product-category>{product.category}</span>
      <Link href={`/product/${product.slug}`} className="product-card__name">{product.title}</Link>
      <div className="product-card__price" data-product-price>
        {formatMoney(product.price, product.currency)}
        {hasDiscount && <><s>{formatMoney(product.originalPrice, product.currency)}</s><span>{Math.round((1 - product.price / product.originalPrice) * 100)}% OFF</span></>}
      </div>
      {product.reviewCount > 0 && <span className="product-card__rating" aria-label={`${product.rating} out of 5 stars, ${product.reviewCount} reviews`}><Icon name="star" size={12} />{product.rating} · {product.reviewCount}</span>}
      {product.stock <= 0 && <span className="mono muted" data-stock-status>Made to order</span>}
    </article>
  );
}
