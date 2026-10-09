import type { Metadata } from "next";
import PageIntro from "@/components/layout/PageIntro";
import About from "@/components/sections/About";
import Process from "@/components/sections/Process";
import CTA from "@/components/sections/CTA";
export const metadata: Metadata = { title: "About the Studio", description: "Meet Zerocraft, a digital studio in Tenkasi bringing together design, code, and story.", alternates: { canonical: "/about" } };
export default function AboutPage() { return <main className="site-main"><PageIntro label="About" title="Independent minds." accent="Shared ambition." description="Zerocraft is a digital studio in Tenkasi, India. We believe in authentic, innovative, and scalable digital products that connect, inspire, and evolve with your brand." /><About /><Process /><CTA /></main>; }
