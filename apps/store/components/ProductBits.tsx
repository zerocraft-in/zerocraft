'use client';
import Icon from './Icon';
import { useCart } from './CartProvider';
import type { Product } from '@/lib/products';
export function QuickAdd({ product }: { product: Product }) { const { add } = useCart(); const size = product.sizes[Math.min(1, product.sizes.length - 1)]; return <button className="product-card__quick-add" onClick={() => add(product.slug, size)} aria-label={`Quick add ${product.name}, size ${size}`}><Icon name="bag" size={16} /> Quick add · {size}</button>; }
