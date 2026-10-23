import Link from "next/link";
export default function NotFound() {
  return (
    <div className="storefront-container checkout-state">
      <h1 className="storefront-display">Scene not found</h1>
      <p style={{ margin: "16px 0 28px", color: "var(--mute)" }}>
        This page left before the interval.
      </p>
      <Link href="/shop" className="storefront-button storefront-button--primary">
        Back to the shop
      </Link>
    </div>
  );
}
