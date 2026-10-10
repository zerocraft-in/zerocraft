import { studioMetadata } from "@/lib/studio-metadata";
import PageIntro from "@/components/layout/PageIntro";
import ProjectBrief from "@/components/sections/ProjectBrief";
import FAQ from "@/components/sections/FAQ";
export const metadata = studioMetadata("Contact — Zerocraft Studio", "Start a conversation with Zerocraft Studio in Tenkasi. Share your idea, project goals, and creative brief.", "/contact");
export default function ContactPage() { return <main className="site-main"><PageIntro label="Contact" title="Every great project" accent="starts with hello." description="A new brand, a better website, or an idea still taking shape. Let’s talk about what comes next." /><ProjectBrief /><FAQ /></main>; }
