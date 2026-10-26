'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { products, inr } from '@/lib/products';
import { ProductTile } from './Graphics';
import Icon from './Icon';

export default function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products.slice(0, 6);
    return products.filter((product) => `${product.name} ${product.lang} ${product.cat} ${product.blurb}`.toLowerCase().includes(term)).slice(0, 8);
  }, [query]);

  useEffect(() => { if (open) window.setTimeout(() => inputRef.current?.focus(), 220); else setQuery(''); }, [open]);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape); return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return <AnimatePresence>{open && <motion.div id="search-overlay" className="search-overlay" role="dialog" aria-modal="true" aria-labelledby="search-overlay-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.div id="search-overlay-panel" className="search-overlay__panel" initial={{ y: '-100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }} transition={{ duration: .55, ease: [.76, 0, .24, 1] }}>
      <div className="search-overlay__topbar"><span id="search-overlay-title" className="mono">Find your next favourite</span><button type="button" onClick={onClose} aria-label="Close search"><span>Close</span><Icon name="close" /></button></div>
      <div className="search-overlay__input-row"><Icon name="search" size={30} /><input id="search-products" ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tees, posters, Tamil…" aria-label="Search products" aria-controls="search-results" />{query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search">Clear</button>}</div>
      <div className="search-overlay__result-heading"><span className="mono">{query ? `${results.length} matches` : 'Popular right now'}</span>{query && <Link href={`/shop?q=${encodeURIComponent(query)}`} onClick={onClose}>View all results <Icon name="arrow" /></Link>}</div>
      {results.length ? <div id="search-results" className="search-overlay__results">{results.map((product, index) => <motion.div key={product.slug} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12 + index * .045 }}><Link href={`/product/${product.slug}`} onClick={onClose} className="search-result-card"><div className="search-result-card__image"><ProductTile art={product.art} /></div><div><span className="mono">{product.lang} · {product.cat}</span><strong>{product.name}</strong><b>{inr(product.price)}</b></div><Icon name="arrow" /></Link></motion.div>)}</div> : <div className="search-overlay__empty"><strong>No products found.</strong><p>Try “tee”, “Tamil”, “poster” or “Malayalam”.</p></div>}
    </motion.div>
  </motion.div>}</AnimatePresence>;
}
