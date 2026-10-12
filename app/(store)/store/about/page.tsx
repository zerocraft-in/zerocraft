import Link from "next/link";
import Breadcrumbs from "@/components/store/Breadcrumbs";
import { IconArrowUpRight } from "@tabler/icons-react";

export default function StoreAboutPage() {
  return (
    <div className="container-site min-h-screen py-8">
      <Breadcrumbs items={[{ label: "About the Store" }]} />
      <section className="my-12 max-w-4xl border-t border-neutral-200 pt-12 dark:border-neutral-800">
        <span className="font-mono text-xs uppercase tracking-widest text-lime-600">Zerocraft / Store Concept</span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">Objects and ideas for considered spaces.</h1>
        <p className="mt-8 max-w-2xl text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
          This is a preview catalog from Zerocraft Studio, a creative and digital studio based in Tenkasi, Tamil Nadu, India. It explores prints, frames, desk objects, and personalized products through the studio&apos;s design perspective.
        </p>
        <p className="mt-5 max-w-2xl text-neutral-600 dark:text-neutral-400">
          Product descriptions, materials, pricing, and availability are draft content. The studio will confirm the details of any order request before fulfillment. No online payment is collected here.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/store/shop" className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-6 py-4 font-mono text-xs font-semibold uppercase tracking-wider text-white hover:bg-lime-400 hover:text-black dark:bg-white dark:text-black">Explore the catalog <IconArrowUpRight size={18} /></Link>
          <Link href="/store/contact" className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-6 py-4 font-mono text-xs font-semibold uppercase tracking-wider dark:border-neutral-700">Ask the studio <IconArrowUpRight size={18} /></Link>
        </div>
      </section>
    </div>
  );
}
