import { studioMetadata } from "@/lib/studio-metadata";
import PageIntro from "@/components/layout/PageIntro";
import Works from "@/components/sections/Works";
import CTA from "@/components/sections/CTA";
export const metadata = studioMetadata("Work & Visual Explorations — Zerocraft Studio", "Explore creative directions, digital concepts, and the Zerocraft studio journal.", "/works");
export default function WorksPage() { return <main className="site-main"><PageIntro label="Work" title="Different disciplines." accent="One creative instinct." description="A collection of concept studies and visual directions, shown with illustrative imagery. For the studio’s latest published photography and design, visit @studio.zerocraft on Instagram." /><Works /><CTA /></main>; }
