
import Hero from "@/components/sections/hero.section";
import Approach from "@/components/sections/process.section";
import WhyZerocraft from "@/components/sections/why.section";

export default function Home() {
  return (
    <div id="home-page">
      <Hero />
      <WhyZerocraft />
      <Approach />
    </div>
  );
}
