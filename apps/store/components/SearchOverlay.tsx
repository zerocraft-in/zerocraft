'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

type SearchProduct = {
  id: string;
  slug: string;
  title: string;
  category: string;
  price: number;
  currency: string;
  images: string[];
};

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export default function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 220);
    else setQuery('');
  }, [open]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ pageSize: query.trim() ? '8' : '6' });
        if (query.trim()) params.set('query', query.trim());
        const response = await fetch(`/api/store/catalog?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Search failed');
        const payload = await response.json() as { products?: { products?: SearchProduct[] } };
        setResults(payload.products?.products ?? []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query.trim() ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, query]);

  return <AnimatePresence>{open && <motion.div id="search-overlay" className="search-overlay" role="dialog" aria-modal="true" aria-labelledby="search-overlay-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.div id="search-overlay-panel" className="search-overlay__panel" initial={{ y: '-100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }} transition={{ duration: .55, ease: [.76, 0, .24, 1] }}>
      <div className="search-overlay__topbar"><span id="search-overlay-title" className="mono">Find your next favourite</span><button type="button" onClick={onClose} aria-label="Close search"><span>Close</span><Icon name="close" /></button></div>
      <div className="search-overlay__input-row"><Icon name="search" size={30} /><input id="search-products" ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the catalog…" aria-label="Search products" aria-controls="search-results" />{query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search">Clear</button>}</div>
      <div className="search-overlay__result-heading"><span className="mono">{loading ? 'Searching…' : query ? `${results.length} matches` : 'Latest products'}</span>{query && <Link href={`/shop?q=${encodeURIComponent(query)}`} onClick={onClose}>View all results <Icon name="arrow" /></Link>}</div>
      {!loading && results.length ? <div id="search-results" className="search-overlay__results">{results.map((product, index) => <motion.div key={product.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .04 + index * .035 }}><Link href={`/product/${product.slug}`} onClick={onClose} className="search-result-card"><div className="search-result-card__image"><img src={product.images[0] ?? '/og-image.jpg'} alt="" /></div><div><span className="mono">{product.category}</span><strong>{product.title}</strong><b>{money(product.price, product.currency)}</b></div><Icon name="arrow" /></Link></motion.div>)}</div> : !loading && <div className="search-overlay__empty"><strong>No products found.</strong><p>Try another name, category, or SKU.</p></div>}
    </motion.div>
  </motion.div>}</AnimatePresence>;
}
