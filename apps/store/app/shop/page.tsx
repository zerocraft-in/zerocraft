import ZeroPopShop from "@/components/zeropop-shop";
import ZeroPopStorePage from "@/components/zeropop-store-page";

export default function ShopPage() {
  return (
    <ZeroPopStorePage
      eyebrow="02 / The edit"
      title="Find your"
      accent="scene."
      description="Original ZEROPOP prints, wearable graphics, considered frames and small objects for people who collect a feeling."
    >
      <ZeroPopShop />
    </ZeroPopStorePage>
  );
}
