import { studioMetadata } from "@/lib/studio-metadata";
import PageIntro from "@/components/layout/PageIntro";
import Works from "@/components/sections/Works";
import CTA from "@/components/sections/CTA";
export const metadata = studioMetadata(
  "Work & Visual Explorations — Zerocraft Studio",
  "Explore creative directions, digital concepts, and the Zerocraft studio journal.",
  "/works",
);
export default async function WorksPage() {
  return (
    <main className="site-main">
      <PageIntro
        label="Work"
        title="Different disciplines."
        accent="One creative instinct."
        description="A collection of published Zerocraft Studio projects across brand, digital, and visual work."
      />
      <Works projects={[]} />
      <CTA />
    </main>
  );
}
