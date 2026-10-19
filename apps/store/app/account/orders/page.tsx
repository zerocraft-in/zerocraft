import Link from "next/link";
import ZeroPopStorePage from "@/components/zeropop-store-page";

export default function OrdersPage() {
  return <ZeroPopStorePage eyebrow="Account / Orders" title="Your" accent="order history."><div className="zeropop-page-panel"><h2>No orders yet.</h2><p>Your first-show purchases will appear here after checkout.</p><Link href="/store/shop" className="zeropop-page-link">Shop the edit →</Link></div></ZeroPopStorePage>;
}
