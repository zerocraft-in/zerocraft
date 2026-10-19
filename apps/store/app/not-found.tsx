import Link from "next/link";
import ZeroPopStorePage from "@/components/zeropop-store-page";

export default function StoreNotFound() {
  return (
    <ZeroPopStorePage
      eyebrow="404 / Interval break"
      title="Scene not"
      accent="found."
    >
      <div className="zeropop-page-panel">
        <p>This route is not part of the current ZEROPOP edit.</p>
        <Link href="/store" className="zeropop-page-link">
          Back to the storefront →
        </Link>
      </div>
    </ZeroPopStorePage>
  );
}
