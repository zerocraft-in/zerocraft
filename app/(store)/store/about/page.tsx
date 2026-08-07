import Image from "next/image";
import Link from "next/link";
import Breadcrumbs from "@/components/store/Breadcrumbs";
import { IconSparkles, IconShieldCheck, IconHeart, IconArrowRight } from "@tabler/icons-react";

export default function AboutPage() {
  return (
    <div className="py-8 min-h-screen">
      <div className="container-site">
        <Breadcrumbs items={[{ label: "About Store" }]} />

        {/* Hero Banner */}
        <div className="my-12 max-w-3xl">
          <span className="text-label text-amber-600 dark:text-amber-400 mb-3 block">
            Our Brand Story
          </span>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-neutral-900 dark:text-white leading-tight mb-6">
            Crafted with Passion. <br /> Delivered with Care.
          </h1>
          <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 font-light leading-relaxed">
            ZeroCraft Store was founded on a simple philosophy: to bridge the gap between architectural minimalism, fine art printing, and functional desk objects. Every single poster, photo frame, notebook, and customized keepsake is produced with uncompromising quality.
          </p>
        </div>

        {/* Visual Showcase Banner */}
        <div className="relative aspect-21/9 w-full rounded-3xl overflow-hidden my-12 bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80">
          <Image
            src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=1600&auto=format&fit=crop"
            alt="ZeroCraft Studio Workspace"
            fill
            sizes="100vw"
            className="object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8 text-white max-w-xl">
            <span className="text-xs font-mono uppercase text-amber-400">Tokyo & San Francisco Studios</span>
            <h3 className="text-2xl font-bold">Where Japanese precision meets modern minimalism.</h3>
          </div>
        </div>

        {/* Brand Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 my-20">
          <div className="p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <IconShieldCheck size={24} />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Archival Grade Materials</h3>
            <p className="text-xs text-neutral-500 font-light leading-relaxed">
              We exclusively source 300gsm Japanese cotton paper, FSC-certified North American white oak, and Horween full-grain leather for longevity.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <IconSparkles size={24} />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Bespoke Personalization</h3>
            <p className="text-xs text-neutral-500 font-light leading-relaxed">
              Custom laser monograms, initial engravings, and silk-lined gift hampers tailored specifically for your special occasions.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <IconHeart size={24} />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Sustainable Crafting</h3>
            <p className="text-xs text-neutral-500 font-light leading-relaxed">
              Zero plastic packaging. Every poster tube and box is crafted from 100% recycled paperboard and printed with soy-based inks.
            </p>
          </div>
        </div>

        {/* CTA Box */}
        <div className="p-12 rounded-3xl bg-neutral-900 text-white text-center my-16 max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl font-bold tracking-tight">Experience ZeroCraft Craftsmanship</h2>
          <p className="text-sm text-neutral-400 max-w-xl mx-auto font-light">
            Explore our curated catalog of 24 handcrafted products designed to elevate your living room, studio, or office workspace.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-amber-400 text-black font-semibold text-xs uppercase tracking-wider hover:bg-amber-300 transition-colors"
          >
            Shop Entire Collection <IconArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
