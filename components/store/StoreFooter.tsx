"use client";

import Link from "next/link";
import { IconArrowUpRight } from "@/components/store/StoreIcon";

export default function StoreFooter() {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="border-t border-black/10 bg-transparent text-[#151311]">
      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 lg:px-14 lg:py-9">
        <div className="flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/store" className="inline-flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-[5px] bg-[#151311] text-[10px] font-black text-white">ZC</span>
              <span><strong className="block text-xs uppercase tracking-[0.16em]">Zerocraft</strong><span className="mt-0.5 block text-[8px] uppercase tracking-[0.2em] text-black/45">Best of the store</span></span>
            </Link>
          </div>
          <nav aria-label="Store footer" className="flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-bold uppercase tracking-[0.14em] text-black/60 sm:justify-end">
            <Link href="/store" className="hover:text-[#e34d2e]">Home</Link>
            <Link href="/store/shop" className="hover:text-[#e34d2e]">Shop</Link>
            <Link href="/store/shop?category=posters" className="hover:text-[#e34d2e]">Posters</Link>
            <Link href="/store/shop?category=photo-frames" className="hover:text-[#e34d2e]">Frames</Link>
            <Link href="/store/shop?category=t-shirts" className="hover:text-[#e34d2e]">Apparel</Link>
            <Link href="/store/contact" className="hover:text-[#e34d2e]">Contact</Link>
          </nav>
        </div>
        <div className="mt-6 flex flex-col justify-between gap-3 border-t border-black/10 pt-4 text-[9px] uppercase tracking-[0.14em] text-black/45 sm:flex-row">
          <span>© {new Date().getFullYear()} Zerocraft Studio · Tenkasi, India</span>
          <button onClick={scrollToTop} className="inline-flex w-fit items-center gap-1 hover:text-[#e34d2e]">Back to top <IconArrowUpRight size={12} /></button>
        </div>
      </div>
    </footer>
  );
}
