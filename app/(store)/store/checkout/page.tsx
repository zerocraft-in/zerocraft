import Link from "next/link";
import ZeroPopStorePage from "@/components/zeropop-store-page";

export default function CheckoutPage() {
  return <ZeroPopStorePage eyebrow="Final frame" title="Secure" accent="checkout."><div className="zeropop-page-panel"><h2>Checkout is ready.</h2><p>Review your cart and delivery details before the order is placed.</p><Link href="/store/cart" className="zeropop-page-link">Review cart →</Link></div></ZeroPopStorePage>;
}
