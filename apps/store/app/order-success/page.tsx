import Link from "next/link";
import ZeroPopStorePage from "@/components/zeropop-store-page";

export default function OrderSuccessPage() {
  return <ZeroPopStorePage eyebrow="Ticket confirmed" title="Housefull." accent="Thank you."><div className="zeropop-page-panel"><h2>Your order is in the reel.</h2><p>We have received your order. A confirmation with dispatch details will follow.</p><Link href="/store" className="zeropop-page-link">Back to ZEROPOP →</Link></div></ZeroPopStorePage>;
}
