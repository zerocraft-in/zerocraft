import CatalogShop from "@/components/store/catalog-shop";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop | Zerocraft Store",
  description: "Browse curated posters, apparel, art prints and accessories from Zerocraft Store.",
};

export default function ShopPage() {
  return <CatalogShop />;
}
