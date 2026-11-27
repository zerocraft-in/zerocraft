'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import { Logo } from './Graphics';
import SearchOverlay from './SearchOverlay';
import { useCart } from './CartProvider';

const NAVIGATION_LINKS = [
  { href: '/shop', label: 'Shop all', index: '01' }, { href: '/shop?cat=tees', label: 'Tees', index: '02' },
  { href: '/shop?cat=hoodies', label: 'Hoodies', index: '03' }, { href: '/shop?cat=posters', label: 'Posters', index: '04' },
  { href: '/shop?cat=frames', label: 'Frames', index: '05' }, { href: '/shop?cat=bundles', label: 'Fan packs', index: '06' },
];

export default function Header() {
  const { count, setOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const isProductPage = pathname.startsWith('/product/');
  const isCartPage = pathname === '/cart';
  const isLightPage = pathname.startsWith('/shop') || pathname.startsWith('/policies/') || pathname === '/faq' || pathname === '/customize';

  useEffect(() => {
    const updateHeader = () => setScrolled(window.scrollY > 24);
    updateHeader(); window.addEventListener('scroll', updateHeader, { passive: true });
    return () => window.removeEventListener('scroll', updateHeader);
  }, []);
  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen || searchOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen, searchOpen]);

  return <>
    <header id="site-header" className={`site-header ${isHomePage ? 'site-header--home' : ''} ${isLightPage ? 'site-header--light' : ''} ${isProductPage ? 'site-header--product' : ''} ${isCartPage ? 'site-header--cart' : ''} ${scrolled || menuOpen ? 'site-header--scrolled' : ''}`} data-page-context={isProductPage ? 'product' : isCartPage ? 'cart' : 'store'} data-scrolled={scrolled || menuOpen ? 'true' : 'false'}>
      <div className="site-container site-header__inner">
        <Link href="/" className="site-header__logo" aria-label="ZeroCraft home"><Logo size={42} color={isLightPage ? '#C23B22' : '#EFB033'} /></Link>
        <nav className="site-header__desktop-nav" aria-label="Main navigation">
          {NAVIGATION_LINKS.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </nav>
        <div className="site-header__actions">
          <button type="button" className="site-header__action" aria-label="Search products" aria-controls="search-overlay" onClick={() => setSearchOpen(true)}><Icon name="search" /><span>Search</span></button>
          <button type="button" className="site-header__cart" aria-label={`Cart, ${count} items`} aria-controls="cart-drawer" onClick={() => setOpen(true)}><Icon name="bag" /><span>Cart</span>{count > 0 && <b key={count}>{count}</b>}</button>
          <button type="button" className="site-header__menu-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen(!menuOpen)}><span>{menuOpen ? 'Close' : 'Menu'}</span><Icon name={menuOpen ? 'close' : 'menu'} /></button>
        </div>
      </div>
    </header>
    <AnimatePresence>
      {menuOpen && <motion.div id="mobile-menu" className="fullscreen-menu" role="dialog" aria-label="Mobile navigation" initial={{ clipPath: 'inset(0 0 100% 0)' }} animate={{ clipPath: 'inset(0 0 0% 0)' }} exit={{ clipPath: 'inset(0 0 100% 0)' }} transition={{ duration: .65, ease: [.76, 0, .24, 1] }}>
        <div className="fullscreen-menu__glow" aria-hidden="true" />
        <nav className="fullscreen-menu__links" aria-label="Mobile navigation">
          {NAVIGATION_LINKS.map((link, index) => <motion.div key={link.href} initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .18 + index * .055 }}><Link href={link.href}><span>{link.index}</span>{link.label}<Icon name="arrow" /></Link></motion.div>)}
        </nav>
        <div className="fullscreen-menu__footer"><button type="button" onClick={() => setSearchOpen(true)}><Icon name="search" /> Search the collection</button><span className="mono">Tamil Nadu · Kerala · Worldwide</span></div>
      </motion.div>}
    </AnimatePresence>
    <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
  </>;
}
