import Image from "next/image";
import Link from "next/link";
import { IconSearch, IconShoppingBag, IconUser } from "./StoreIcon";

export default function ZeroPopHeader() {
  return (
    <header className="zeropop-page-header">
      <nav aria-label="Store navigation">
        <Link href="/store/shop">Shop</Link>
        <Link href="/store/about">About</Link>
        <Link href="/store/contact">Contact</Link>
      </nav>
      <Link className="zeropop-page-brand" href="/" aria-label="ZEROPOP home">
        <Image src="/brand/zeropop-logo-header.svg" alt="ZEROPOP" width={158} height={50} priority />
        <span>BY ZEROCRAFT STUDIO</span>
      </Link>
      <div className="zeropop-page-actions">
        <Link href="/store/search" aria-label="Search"><IconSearch /></Link>
        <Link href="/store/account" aria-label="Account"><IconUser /></Link>
        <Link href="/store/cart" aria-label="Cart"><IconShoppingBag /></Link>
      </div>
    </header>
  );
}
