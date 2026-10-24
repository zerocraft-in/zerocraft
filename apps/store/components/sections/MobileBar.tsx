"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";

export default function MobileBar() {
  const { count, openCart } = useStore();
  const pathname = usePathname();
  return (
    <nav className="mobile-navigation" aria-label="Mobile navigation">
      <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="m3 10 9-7 9 7" />
          <path d="M5 9v12h14V9M9 21v-7h6v7" />
        </svg>
        <span>Home</span>
      </Link>
      <Link href="/shop?focus=1" aria-current={pathname === "/shop" ? "page" : undefined}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 4.2 4.2" />
        </svg>
        <span>Search</span>
      </Link>
      <Link href="/categories" aria-current={pathname === "/categories" ? "page" : undefined}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 5h16M4 10h16M4 15h10M4 20h10" />
          <path d="m17 15 3 3-3 3" />
        </svg>
        <span>Catalog</span>
      </Link>
      <button
        type="button"
        onClick={openCart}
        aria-label={`Open cart, ${count} ${count === 1 ? "item" : "items"}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.3a2 2 0 0 0 1.9-1.4L20 8H6" />
          <circle cx="9.5" cy="19" r="1.2" />
          <circle cx="17" cy="19" r="1.2" />
        </svg>
        <span>Cart{count > 0 ? ` (${count})` : ""}</span>
      </button>
    </nav>
  );
}
