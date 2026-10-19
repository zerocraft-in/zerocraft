import { studioMetadata } from "@/lib/studio-metadata";
import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Services from "@/components/sections/Services";
import Clients from "@/components/sections/Clients";
import CTA from "@/components/sections/CTA";

export const metadata = studioMetadata(
  "Creative & Digital Studio — Zerocraft Studio",
  "Zerocraft Studio builds distinctive brands, meaningful digital experiences, and compelling visual stories.",
  "/",
);

export default function StudioHomePage() {
  return (
    <main className="site-main">
      <Hero />
      <About />
      <Services />
      <Clients />
      <CTA />
    </main>
  );
}
