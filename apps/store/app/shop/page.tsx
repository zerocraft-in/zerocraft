import type { Metadata } from "next";
import Shop from "@/components/sections/Shop";

export const metadata: Metadata = {
  title: "Shop all",
  description:
    "Browse the full Zerocraft drop: original tees, hoodies, posters, frames, accessories, and digital art.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <section className="shop-page">
      <div className="storefront-container">
        <div className="storefront-section-heading">
          <div>
            <div className="storefront-kicker storefront-mono">
              Frequency 01 / Full catalog
            </div>
            <h1 className="storefront-display shop-page__title">
              Shop the <em>drop.</em>
            </h1>
            <p className="shop-page__intro">
              Every original. One frequency. Find your next favorite.
            </p>
          </div>
        </div>
        <Shop
          key={JSON.stringify(sp)}
          init={{ cat: sp.cat, lang: sp.lang, q: sp.q, focus: !!sp.focus }}
          step={12}
        />
      </div>
    </section>
  );
}
