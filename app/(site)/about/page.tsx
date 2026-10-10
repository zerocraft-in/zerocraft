import { studioMetadata } from "@/lib/studio-metadata";
import PageIntro from "@/components/layout/PageIntro";
import About from "@/components/sections/About";
import Process from "@/components/sections/Process";
import CTA from "@/components/sections/CTA";
export const metadata = studioMetadata("About the Studio — Zerocraft Studio", "Meet Zerocraft, an Independent Creative & Digital Studio in Tenkasi, Tamil Nadu, India.", "/about");
export default function AboutPage() { return <main className="site-main"><PageIntro label="About" title="Independent minds." accent="Shared ambition." description="An Independent Creative & Digital Studio based in Tenkasi, Tamil Nadu, India. Design, technology, and storytelling, brought together with purpose." /><About showLink={false} /><Process /><CTA /></main>; }
