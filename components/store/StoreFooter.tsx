"use client";

import Link from "next/link";
import { IconArrowUp, IconArrowUpRight } from "@tabler/icons-react";

export default function StoreFooter() {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="border-t border-white/10 bg-[#111111] text-white/60">
      <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-14 lg:py-12">
        <div className="flex flex-col gap-8 border-b border-white/10 pb-9 sm:flex-row sm:items-end sm:justify-between">
          <Link href="/store" className="group flex w-fit items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black text-black transition-transform group-hover:-rotate-6">ZC</span>
            <span><strong className="block text-sm uppercase tracking-[0.14em] text-white">Zerocraft</strong><span className="block text-[10px] uppercase tracking-[0.18em] text-white/45">Print studio</span></span>
          </Link>
          <p className="max-w-xs text-[10px] font-bold uppercase leading-5 tracking-[0.14em] text-white/45 sm:text-right">Made to order · Studio-reviewed orders · Tenkasi, India</p>
        </div>

        <div className="flex flex-col gap-7 py-8 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap gap-x-6 gap-y-3 text-[10px] font-bold uppercase tracking-[0.16em]">
            <Link href="/store" className="transition-colors hover:text-white">Home</Link>
            <Link href="/store/shop" className="transition-colors hover:text-white">Shop</Link>
            <Link href="/store/shop?category=t-shirts" className="transition-colors hover:text-white">Apparel</Link>
            <Link href="/store/shop?category=customized-gifts" className="transition-colors hover:text-white">Custom</Link>
            <Link href="/store/contact" className="transition-colors hover:text-white">Contact</Link>
          </nav>
          <button onClick={scrollToTop} className="flex w-fit items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:text-[#ffb703]">Back to top <IconArrowUp size={14} /></button>
        </div>

        <div className="flex flex-col justify-between gap-2 border-t border-white/10 pt-5 text-[10px] uppercase tracking-[0.14em] text-white/35 sm:flex-row">
          <span>© {new Date().getFullYear()} Zerocraft Studio</span>
          <span className="inline-flex items-center gap-1">Originals for your space <IconArrowUpRight size={12} /></span>
        </div>
      </div>
    </footer>
  );
}
