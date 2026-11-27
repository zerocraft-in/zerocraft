'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import { useCart } from './CartProvider';
import type { CatalogProduct } from '@/lib/commerce/catalog';

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export default function CatalogProductCard({ product }: { product: CatalogProduct }) {
  const { add } = useCart();
  const router = useRouter();
  const [variantPickerOpen, setVariantPickerOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState(product.variants[0]?.id ?? '');
  const size = product.sizes[0] ?? 'One size';
  const hasVariants = product.variants.length > 0;
  const hasDiscount = product.originalPrice > product.price;
  const badge = product.isNew ? 'NEW' : hasDiscount ? `${Math.round((1 - product.price / product.originalPrice) * 100)}% OFF` : null;

  useEffect(() => {
    if (!variantPickerOpen) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setVariantPickerOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [variantPickerOpen]);

  const handleQuickAdd = () => {
    if (hasVariants) {
      setSelectedVariantId(product.variants[0]?.id ?? '');
      setVariantPickerOpen(true);
      return;
    }

    add(product.slug, size, 1, false, {
      title: product.title,
      price: product.price,
      currency: product.currency,
      image: product.images[0],
    });
    router.push('/cart');
  };

  const selectedVariant = product.variants.find((variant) => variant.id === selectedVariantId);
  const variantLabel = selectedVariant?.label || selectedVariant?.options.size || 'Selected variant';

  const addSelectedVariant = () => {
    if (!selectedVariant || (selectedVariant.stock !== null && selectedVariant.stock <= 0)) return;
    add(product.slug, variantLabel, 1, false, {
      title: product.title,
      price: selectedVariant.price,
      currency: selectedVariant.currency,
      image: product.images[0],
    });
    setVariantPickerOpen(false);
    router.push('/cart');
  };

  return (
    <article id={`catalog-product-${product.slug}`} className="product-card" data-product-id={product.id} data-product-slug={product.slug}>
      <div className="product-card__media">
        <Link href={`/product/${product.slug}`} className="product-card__image-link" aria-label={`View ${product.title}`}>
          <div className="pt catalog-product-card__image">
            <img src={product.images[0] ?? '/og-image.jpg'} alt={product.title} loading="lazy" />
          </div>
        </Link>
        {badge && <span className={`product-card__badge ${hasDiscount ? 'product-card__badge--sale' : ''}`} data-badge={badge}>{badge}</span>}
        <button type="button" className={`product-card__quick-add ${hasVariants ? 'product-card__quick-add--variants' : ''}`} onClick={handleQuickAdd} aria-label={hasVariants ? `Select variants for ${product.title}` : `Add ${product.title} to cart`} data-action={hasVariants ? 'select-variants' : 'quick-add'}>
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
      {variantPickerOpen && (
        <div className="variant-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setVariantPickerOpen(false); }}>
          <section className="variant-modal__panel" role="dialog" aria-modal="true" aria-labelledby={`variant-modal-title-${product.slug}`}>
            <div className="variant-modal__topbar">
              <div>
                <span className="mono gold">Choose your variant</span>
                <h2 id={`variant-modal-title-${product.slug}`}>{product.title}</h2>
              </div>
              <button type="button" className="iconbtn" onClick={() => setVariantPickerOpen(false)} aria-label="Close variant selector"><Icon name="close" /></button>
            </div>
            <div className="variant-modal__options" role="radiogroup" aria-label={`Variants for ${product.title}`}>
              {product.variants.map((variant) => {
                const unavailable = variant.stock !== null && variant.stock <= 0;
                const label = variant.label || variant.options.size || 'Variant';
                return (
                  <button
                    type="button"
                    key={variant.id}
                    role="radio"
                    aria-checked={selectedVariantId === variant.id}
                    aria-disabled={unavailable}
                    disabled={unavailable}
                    className={`variant-modal__option ${selectedVariantId === variant.id ? 'on' : ''}`}
                    onClick={() => setSelectedVariantId(variant.id)}
                  >
                    <span>{label}</span>
                    <small>{unavailable ? 'Out of stock' : variant.stock === null ? 'Available' : `${variant.stock} left`}</small>
                  </button>
                );
              })}
            </div>
            <div className="variant-modal__footer">
              <span className="muted small">Selected: {variantLabel}</span>
              <button type="button" className="btn" onClick={addSelectedVariant} disabled={!selectedVariant || (selectedVariant.stock !== null && selectedVariant.stock <= 0)}>
                Add to cart <Icon name="arrow" />
              </button>
            </div>
          </section>
        </div>
      )}
    </article>
  );
}
