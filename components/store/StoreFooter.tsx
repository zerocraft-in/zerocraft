"use client";

import Link from "next/link";
import {
  IconBrandInstagram,
  IconBrandTwitter,
  IconBrandPinterest,
  IconBrandLinkedin,
  IconArrowUp,
  IconHeart,
} from "@tabler/icons-react";

export default function StoreFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-neutral-950 text-neutral-400 text-xs border-t border-neutral-900">
      {/* Top Banner */}
      <div className="border-b border-neutral-900 py-12">
        <div className="container-site flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black font-bold">
              ZC
            </div>
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                ZeroCraft Store
              </h3>
              <p className="text-xs text-neutral-400 font-light">
                Crafted with Passion. Delivered with Care.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 font-mono text-neutral-300">
            <span>Free Shipping Over $100</span>
            <span>•</span>
            <span>30-Day Money Back</span>
            <span>•</span>
            <span>24/7 Support</span>
          </div>
        </div>
      </div>

      {/* Main Link Columns */}
      <div className="py-16 container-site grid grid-cols-2 md:grid-cols-5 gap-8">
        {/* Col 1: Brand & Domain */}
        <div className="col-span-2 space-y-4">
          <h4 className="font-mono text-white uppercase tracking-widest text-xs font-semibold">
            About ZeroCraft
          </h4>
          <p className="text-xs text-neutral-400 leading-relaxed font-light max-w-sm">
            ZeroCraft Store is a luxury studio storefront dedicated to minimal design, fine art printing, handcrafted framing, and bespoke personalized gifts for modern spaces.
          </p>
          <div className="pt-2 font-mono text-[11px] text-amber-400">
            Domain: store.zerocraft.in
          </div>
        </div>

        {/* Col 2: Quick Links */}
        <div className="space-y-3">
          <h4 className="font-mono text-white uppercase tracking-widest text-xs font-semibold">
            Quick Links
          </h4>
          <ul className="space-y-2">
            <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
            <li><Link href="/shop" className="hover:text-white transition-colors">Shop Catalog</Link></li>
            <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
            <li><Link href="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
            <li><Link href="/wishlist" className="hover:text-white transition-colors">My Wishlist</Link></li>
            <li><Link href="/cart" className="hover:text-white transition-colors">Shopping Cart</Link></li>
          </ul>
        </div>

        {/* Col 3: Categories */}
        <div className="space-y-3">
          <h4 className="font-mono text-white uppercase tracking-widest text-xs font-semibold">
            Categories
          </h4>
          <ul className="space-y-2">
            <li><Link href="/category/posters" className="hover:text-white transition-colors">Posters</Link></li>
            <li><Link href="/category/photo-frames" className="hover:text-white transition-colors">Photo Frames</Link></li>
            <li><Link href="/category/customized-gifts" className="hover:text-white transition-colors">Customized Gifts</Link></li>
            <li><Link href="/category/notebooks" className="hover:text-white transition-colors">Notebooks</Link></li>
            <li><Link href="/category/accessories" className="hover:text-white transition-colors">Accessories</Link></li>
            <li><Link href="/category/desk-decor" className="hover:text-white transition-colors">Desk Decor</Link></li>
          </ul>
        </div>

        {/* Col 4: Policies & Help */}
        <div className="space-y-3">
          <h4 className="font-mono text-white uppercase tracking-widest text-xs font-semibold">
            Customer Help
          </h4>
          <ul className="space-y-2">
            <li><Link href="/contact#faq" className="hover:text-white transition-colors">Shipping & Returns</Link></li>
            <li><Link href="/contact#faq" className="hover:text-white transition-colors">Track Order</Link></li>
            <li><Link href="/contact#faq" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link href="/contact#faq" className="hover:text-white transition-colors">Terms of Service</Link></li>
            <li><Link href="/contact#faq" className="hover:text-white transition-colors">Care Instructions</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom Copyright & Back to Top */}
      <div className="border-t border-neutral-900 py-6">
        <div className="container-site flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px]">
          <p>© {new Date().getFullYear()} ZeroCraft Store (store.zerocraft.in). All rights reserved.</p>

          <div className="flex items-center space-x-4">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              <IconBrandInstagram size={18} />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              <IconBrandTwitter size={18} />
            </a>
            <a href="https://pinterest.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              <IconBrandPinterest size={18} />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              <IconBrandLinkedin size={18} />
            </a>
          </div>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-1 text-white hover:text-amber-400 transition-colors uppercase tracking-wider font-semibold"
          >
            Back to top <IconArrowUp size={14} />
          </button>
        </div>
      </div>
    </footer>
  );
}
