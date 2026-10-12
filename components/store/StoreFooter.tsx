"use client";

import Link from "next/link";
import { IconArrowUp } from "@tabler/icons-react";
import { studioSocials } from "@/lib/studio-config";

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
                A preview of products and custom ideas from the studio.
              </p>
            </div>
          </div>

          <p className="font-mono text-neutral-300">Requests are reviewed by the studio. No online payment is collected.</p>
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
            Explore a preview of the studio catalog. Product specifications, availability, delivery, and pricing are confirmed before fulfillment.
          </p>
        </div>

        {/* Col 2: Quick Links */}
        <div className="space-y-3">
          <h4 className="font-mono text-white uppercase tracking-widest text-xs font-semibold">
            Quick Links
          </h4>
          <ul className="space-y-2">
            <li><Link href="/store" className="hover:text-white transition-colors">Home</Link></li>
            <li><Link href="/store/shop" className="hover:text-white transition-colors">Shop Catalog</Link></li>
            <li><Link href="/store/about" className="hover:text-white transition-colors">About Us</Link></li>
            <li><Link href="/store/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
            <li><Link href="/store/wishlist" className="hover:text-white transition-colors">My Wishlist</Link></li>
            <li><Link href="/store/cart" className="hover:text-white transition-colors">Shopping Cart</Link></li>
          </ul>
        </div>

        {/* Col 3: Categories */}
        <div className="space-y-3">
          <h4 className="font-mono text-white uppercase tracking-widest text-xs font-semibold">
            Categories
          </h4>
          <ul className="space-y-2">
            <li><Link href="/store/category/posters" className="hover:text-white transition-colors">Posters</Link></li>
            <li><Link href="/store/category/photo-frames" className="hover:text-white transition-colors">Photo Frames</Link></li>
            <li><Link href="/store/category/customized-gifts" className="hover:text-white transition-colors">Customized Gifts</Link></li>
            <li><Link href="/store/category/notebooks" className="hover:text-white transition-colors">Notebooks</Link></li>
            <li><Link href="/store/category/accessories" className="hover:text-white transition-colors">Accessories</Link></li>
            <li><Link href="/store/category/desk-decor" className="hover:text-white transition-colors">Desk Decor</Link></li>
          </ul>
        </div>

        {/* Col 4: Policies & Help */}
        <div className="space-y-3">
          <h4 className="font-mono text-white uppercase tracking-widest text-xs font-semibold">
            Customer Help
          </h4>
          <ul className="space-y-2">
            <li><Link href="/store/contact" className="hover:text-white transition-colors">Contact the studio</Link></li>
            <li><Link href="/store/account/orders" className="hover:text-white transition-colors">Order requests in this browser</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom Copyright & Back to Top */}
      <div className="border-t border-neutral-900 py-6">
        <div className="container-site flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px]">
          <p>© {new Date().getFullYear()} Zerocraft Studio. All rights reserved.</p>

          <div className="flex items-center space-x-4">
            {studioSocials.map((social) => <a key={social.label} href={social.url} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{social.label}</a>)}
          </div>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-1 text-white hover:text-lime-400 transition-colors uppercase tracking-wider font-semibold"
          >
            Back to top <IconArrowUp size={14} />
          </button>
        </div>
      </div>
    </footer>
  );
}
