'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CatalogProduct, CatalogSort } from '@/lib/commerce/catalog';
import CatalogProductCard from './CatalogProductCard';

const PAGE_SIZE = 12;

type InfiniteProductGridProps = {
  initialProducts: CatalogProduct[];
  total: number;
  categorySlug?: string;
  query?: string;
  sort: CatalogSort;
};

export default function InfiniteProductGrid({
  initialProducts,
  total,
  categorySlug,
  query,
  sort,
}: InfiniteProductGridProps) {
  const [products, setProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exhausted, setExhausted] = useState(initialProducts.length >= total);
  const nextPage = useRef(2);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const hasMore = !exhausted && products.length < total;

  const loadMore = useCallback(async () => {
    if (loadingRef.current || products.length >= total) return;
    loadingRef.current = true;
    setLoading(true);
    setError('');

    const params = new URLSearchParams({
      page: String(nextPage.current),
      pageSize: String(PAGE_SIZE),
      sort,
    });
    if (categorySlug) params.set('category', categorySlug);
    if (query) params.set('query', query);

    try {
      const response = await fetch(`/api/store/catalog?${params.toString()}`);
      if (!response.ok) throw new Error('Catalog request failed');
      const payload = await response.json() as {
        products?: { products?: CatalogProduct[]; total?: number };
      };
      const incoming = payload.products?.products ?? [];
      setProducts((current) => {
        const byId = new Map(current.map((product) => [product.id, product]));
        incoming.forEach((product) => byId.set(product.id, product));
        return [...byId.values()];
      });
      if (incoming.length < PAGE_SIZE) setExhausted(true);
      nextPage.current += 1;
    } catch {
      setError('More products could not be loaded.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [categorySlug, products.length, query, sort, total]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const loadWhenNearEnd = () => {
      const nearDocumentEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 800;
      const nearSentinel = sentinel.getBoundingClientRect().top <= window.innerHeight + 600;
      if (nearDocumentEnd || nearSentinel) void loadMore();
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(sentinel);
    window.addEventListener('scroll', loadWhenNearEnd, { passive: true });
    loadWhenNearEnd();
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', loadWhenNearEnd);
    };
  }, [hasMore, loadMore]);

  return (
    <>
      <div className="pgrid infinite-product-grid" aria-live="polite">
        {products.map((product, index) => (
          <motion.div
            className="infinite-product-grid__item"
            key={product.id}
            initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.985 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '0px 0px -8% 0px' }}
            transition={{ duration: 0.45, delay: Math.min(index % PAGE_SIZE, 3) * 0.045, ease: [0.22, 1, 0.36, 1] }}
          >
            <CatalogProductCard product={product} />
          </motion.div>
        ))}
      </div>
      <motion.div
        ref={sentinelRef}
        className="infinite-product-grid__sentinel"
        aria-hidden="true"
        onViewportEnter={() => { if (hasMore) void loadMore(); }}
        viewport={{ margin: '600px 0px' }}
      />
      <div className="infinite-product-grid__status" role="status" aria-live="polite">
        {loading && <><span className="catalog-loader" aria-hidden="true" /> Loading more products…</>}
        {error && <><span>{error}</span><button type="button" className="btn o sm" onClick={() => void loadMore()}>Try again</button></>}
        {hasMore && !loading && !error && <button type="button" className="infinite-product-grid__manual link" onClick={() => void loadMore()}>Load more products</button>}
        {!hasMore && products.length > 0 && <span>All {products.length} products loaded.</span>}
      </div>
    </>
  );
}
