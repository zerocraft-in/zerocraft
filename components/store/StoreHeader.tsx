"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { IconMenu2, IconSearch, IconShoppingBag, IconX } from "@/components/store/StoreIcon";
import { useStore } from "@/lib/store/useStore";
import { storeHref } from "@/lib/domains";

const navLinks = [
  { label: "Home", href: storeHref("/store") },
  { label: "Shop", href: storeHref("/store/shop") },
  { label: "Categories", href: storeHref("/store/shop#categories") },
  { label: "Collections", href: storeHref("/store/shop#collections") },
  { label: "About", href: storeHref("/store/about") },
  { label: "Contact", href: storeHref("/store/contact") },
];

export default function StoreHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { cart, toggleCartDrawer, toggleSearchModal } = useStore();
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return <>
    <header className={`fixed inset-x-0 top-0 z-[200] text-[#151311] transition-all duration-300 ${scrolled ? "border-b border-black/10 bg-[#f6f2eb]/92 py-3 backdrop-blur-xl" : "bg-[#f6f2eb]/82 py-4 backdrop-blur-md"}`}>
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-14">
        <Link href={storeHref("/store")} className="group flex items-center gap-2.5" aria-label="ZeroCraft Store Home">
          <span className="flex h-9 w-9 items-center justify-center rounded-[5px] bg-[#151311] text-white transition-transform group-hover:rotate-6"><svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true"><path d="M5.16.43c4.97,7.25,9.93,8.51,14.9,3.78,1.09,1.24,1.94,2.48,2.53,3.71-2.41,3.97-7.69,4.08-11.59,6.41,4.15-.64,8.18-.19,12.08,1.37-.44,1.21-1.13,2.42-2.07,3.63-5.6-5.34-11.2-3.92-16.8,4.26-1.48-1.89-2.57-3.78-3.3-5.67,2.87-6.36,8.78-7.1,12.63-8.59-3.92-.16-7.97-1.26-12.14-3.32.88-1.86,2.13-3.72,3.76-5.58h0Z" /></svg></span>
          <span className="flex flex-col"><span className="text-sm font-black uppercase leading-none tracking-tight">ZeroCraft</span><span className="mt-1 text-[9px] uppercase tracking-[0.24em] text-black/45">Best of the store</span></span>
        </Link>
        <nav className="hidden items-center gap-7 lg:flex">{navLinks.map((link) => <Link key={link.href} href={link.href} className={`relative py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${pathname === link.href ? "text-[#151311]" : "text-black/45 hover:text-[#151311]"}`}>{link.label}{pathname === link.href && <motion.span layoutId="store-active-nav" className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#e34d2e]" />}</Link>)}</nav>
        <div className="flex items-center gap-1.5 sm:gap-2"><button onClick={() => toggleSearchModal(true)} aria-label="Search store" className="rounded-full p-2.5 text-black/60 transition-colors hover:bg-black/5 hover:text-[#151311]"><IconSearch size={18} /></button><button onClick={() => toggleCartDrawer(true)} aria-label="Open cart" className="relative flex items-center gap-2 rounded-[5px] bg-[#151311] px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-white transition-colors hover:bg-[#e34d2e]"><IconShoppingBag size={16} /><span className="hidden sm:inline">Cart</span>{totalCartCount > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f5b544] text-[10px] text-[#151311]">{totalCartCount}</span>}</button><button onClick={() => setMobileMenuOpen((open) => !open)} aria-label="Toggle menu" className="rounded-full p-2.5 text-[#151311] transition-colors hover:bg-black/5 lg:hidden">{mobileMenuOpen ? <IconX size={20} /> : <IconMenu2 size={20} />}</button></div>
      </div>
    </header>
    <AnimatePresence>{mobileMenuOpen && <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="fixed inset-x-0 top-[68px] z-[190] flex max-h-[calc(100dvh-68px)] flex-col justify-between overflow-y-auto border-t border-black/10 bg-[#f6f2eb] p-6 text-[#151311] lg:hidden"><nav className="grid gap-1">{navLinks.map((link) => <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} className="border-b border-black/10 py-4 text-xl font-black tracking-tight hover:text-[#e34d2e]">{link.label}</Link>)}</nav><p className="border-t border-black/10 pt-6 text-center text-xs text-black/45">Zerocraft Studio · Tenkasi, India</p></motion.div>}</AnimatePresence>
  </>;
}
