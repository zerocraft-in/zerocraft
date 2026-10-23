import type { Metadata } from "next";
import CheckoutClient from "@/components/sections/CheckoutClient";
export const metadata: Metadata = { title: "Checkout" };
export default function CheckoutPage() {
  return (
    <div className="storefront-container">
      <CheckoutClient />
    </div>
  );
}
