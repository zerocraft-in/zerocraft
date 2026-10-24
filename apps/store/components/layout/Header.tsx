"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Logo } from "./InlineBranding";

export default function Header() {
  const { count, openCart, catalog } = useStore();
  const categories = [...new Set(catalog.map((product) => product.c))];
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link
          href="/"
          className="site-header__brand"
          aria-label="Zerocraft home"
        >
          <Logo />
        </Link>
        <nav className="site-header__nav" aria-label="Main navigation">
          <Link href="/shop">Shop all</Link>
          {categories.map((c) => (
            <Link key={c} href={`/shop?cat=${encodeURIComponent(c)}`}>
              {c}
            </Link>
          ))}
          <Link href="/#storefront-bundles">Bundles</Link>
        </nav>
        <div className="site-header__actions">
          <Link
            href="/shop?focus=1"
            className="site-header__icon site-header__search"
            aria-label="Search products"
            title="Search"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
              fill="none"
            >
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 4.2 4.2" />
            </svg>
          </Link>
          <Link
            href="/account"
            className="site-header__icon site-header__profile"
            aria-label="Your account"
            title="Your account"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
              fill="none"
            >
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20a7 7 0 0 1 14 0" />
            </svg>
          </Link>
          <button
            className="site-header__icon site-header__cart-button"
            onClick={openCart}
            aria-label={`Open cart, ${count} ${count === 1 ? "item" : "items"}`}
            title="Cart"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
              fill="none"
            >
              <path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.3a2 2 0 0 0 1.9-1.4L20 8H6" />
              <circle cx="9.5" cy="19" r="1.2" />
              <circle cx="17" cy="19" r="1.2" />
            </svg>
            {count > 0 && (
              <span className="site-header__cart-count" aria-hidden="true">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
