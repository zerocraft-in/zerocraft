import Bundles from "@/components/sections/Bundles";
import Categories from "@/components/sections/Categories";
import Faq from "@/components/sections/FAQ";
import Hero from "@/components/sections/Hero";
import LanguagePanels from "@/components/sections/LanguagePanels";
import Newsletter from "@/components/sections/Newsletter";
import Reviews from "@/components/sections/Reviews";
import Story from "@/components/sections/Story";
import Trust from "@/components/sections/Trust";
import TrendingProducts from "@/components/sections/TrendingProducts";
import TypographyBand from "@/components/sections/TypographyBand";

export default function StoreHomePage() {
  return (
    <div>
      <Hero />

      <Categories />
      <LanguagePanels />
      <TrendingProducts />
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
