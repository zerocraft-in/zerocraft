import { studioMetadata } from "@/lib/studio-metadata";
import { studio } from "@/lib/studio-config";
import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Services from "@/components/sections/Services";
import Works from "@/components/sections/Works";
import Process from "@/components/sections/Process";
import FAQ from "@/components/sections/FAQ";
import CTA from "@/components/sections/CTA";
import { createClient } from "@/utils/supabase/server";

export const metadata = studioMetadata(
  "Zerocraft Studio — Branding, Design & Digital Experiences", studio.description, "/",
  "Zerocraft Studio — Creative & Digital Studio",
  "Distinctive brands. Meaningful digital experiences. Compelling visual stories. Crafted with purpose at Zerocraft Studio.",
);

export default async function Home() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("works")
    .select("id,title,category,image_url,client_name,description,featured")
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });
  return (
    <main className="site-main">
      <Hero />
      <Works projects={projects || []} />
      <Services />
      <About />
      <Process />
      <FAQ />
      <CTA />
    </main>
  );
}
