import Link from "next/link";
import ZeroPopStorePage from "@/components/zeropop-store-page";

export default function CartPage() {
  return <ZeroPopStorePage eyebrow="Your seat" title="Your" accent="cart."><div className="zeropop-page-panel"><h2>Ready for the interval?</h2><p>Your cart is managed in the storefront drawer. Add a design from the shop and come back here when you are ready to checkout.</p><Link className="zeropop-page-link" href="/store/shop">Browse the drop →</Link></div></ZeroPopStorePage>;
}
