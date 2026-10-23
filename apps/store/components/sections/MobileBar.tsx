"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";

export default function MobileBar() {
  const { count, openCart } = useStore();
  return (
    <div className="mobile-navigation">
      <Link href="/shop">
        <i>⌂</i>Shop
      </Link>
      <Link href="/shop?focus=1">
        <i>⌕</i>Search
      </Link>
      <Link href="/shop?cat=Wishlist">
        <i>♡</i>Saved
      </Link>
      <button onClick={openCart}>
        <i>◫</i>Cart {count}
      </button>
    </div>
  );
}
