import Bundles from "@/components/sections/Bundles";
import Categories from "@/components/sections/Categories";
import Faq from "@/components/sections/FAQ";
import Hero from "@/components/sections/Hero";
import LanguagePanels from "@/components/sections/LanguagePanels";
import Newsletter from "@/components/sections/Newsletter";
import Reviews from "@/components/sections/Reviews";
import Shop from "@/components/sections/Shop";
import Story from "@/components/sections/Story";
import Trust from "@/components/sections/Trust";
import TypographyBand from "@/components/sections/TypographyBand";
import {
  getCategories,
  getCollections,
  getFeaturedProducts,
} from "@/lib/commerce/catalog";
import Link from "next/link";

export default async function StoreHomePage() {
  const [products, categories, collections] = await Promise.all([
    getFeaturedProducts(24),
    getCategories(),
    getCollections(),
  ]);

  return (
    <div>
      <Hero />

      <Categories />
      <LanguagePanels />
      <section id="storefront-shop" style={{ paddingTop: 0 }}>
        <div className="storefront-container">
          <div className="storefront-section-heading">
            <div>
              <div className="storefront-kicker storefront-mono">
                03 / Now trending
              </div>
              <h2 className="storefront-display">
                First day. <em>First show.</em>
              </h2>
            </div>
            <Link href="/shop" className="storefront-link storefront-mono">
              Shop all →
            </Link>
          </div>
          <Shop init={{}} step={8} />
        </div>
      </section>
      <TypographyBand />
      <Bundles />
      <Story />
      <Reviews />
      <Faq />
      <Trust />
      <Newsletter />
    </div>
  );
}
