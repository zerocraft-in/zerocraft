import Link from "next/link";
import Breadcrumbs from "@/components/store/Breadcrumbs";
import { IconArrowUpRight, IconSparkles, IconShieldCheck, IconPackage } from "@/components/store/StoreIcon";

const principles = [
  ["Original by default", "Our starting point is always an in-house idea: type, rhythm, colour, memory or material."],
  ["Made with intention", "Prints, frames and everyday objects are designed to live with you, not compete with the room."],
  ["Clear about rights", "Licensed or fan-inspired work is labelled. We do not imply celebrity endorsements or fake film licenses."],
];

export default function StoreAboutPage() {
  return (
    <div className="min-h-screen bg-[#f8f7f3] px-5 py-8 text-[#151515] sm:px-8 lg:px-14">
      <div className="mx-auto max-w-7xl"><Breadcrumbs items={[{ label: "About the Store" }]} />
        <section className="relative overflow-hidden rounded-[10px] bg-[#211b16] px-7 py-16 text-white sm:px-12 sm:py-24 lg:px-20"><div className="store-about-orbit absolute -right-24 -top-24 h-80 w-80 rounded-full border border-[#f5b544]/30" aria-hidden="true" /><div className="relative max-w-3xl"><p className="text-[10px] font-black uppercase tracking-[.26em] text-[#f5b544]">Zerocraft / Store concept</p><h1 className="mt-6 max-w-3xl font-secondary text-5xl font-bold leading-[.9] tracking-[-.05em] sm:text-8xl">Collect the feeling. Keep the scene.</h1><p className="mt-7 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">Zerocraft Store is a small design-led collection from Tenkasi, Tamil Nadu: original prints, frames, apparel and objects for people who live close to stories.</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/store/shop" className="inline-flex items-center gap-2 rounded-[5px] bg-white px-5 py-3 text-[10px] font-black uppercase tracking-wider text-[#151311]">Explore the edit <IconArrowUpRight size={15} /></Link><Link href="/store/contact" className="inline-flex items-center gap-2 rounded-[5px] border border-white/30 px-5 py-3 text-[10px] font-black uppercase tracking-wider text-white">Ask the studio <IconArrowUpRight size={15} /></Link></div></div></section>
        <section className="grid gap-5 py-16 sm:grid-cols-3 lg:py-20">{principles.map(([title, text], index) => <article key={title} className="rounded-[8px] border border-black/10 bg-white/70 p-6"><span className="text-[10px] font-black uppercase tracking-[.2em] text-[#e34d2e]">0{index + 1}</span><h2 className="mt-8 text-xl font-black tracking-tight">{title}</h2><p className="mt-3 text-sm leading-6 text-black/60">{text}</p></article>)}</section>
        <section className="grid gap-12 border-t border-black/10 py-16 lg:grid-cols-[.8fr_1.2fr] lg:py-24"><div><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#e34d2e]">How the store works</p><h2 className="mt-3 max-w-md font-secondary text-4xl font-bold leading-none tracking-[-.04em] sm:text-6xl">A considered edit, from idea to doorstep.</h2></div><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-[8px] bg-[#efe8dc] p-5"><IconSparkles size={21} className="text-[#e34d2e]" /><h3 className="mt-8 text-sm font-black">Find your scene</h3><p className="mt-2 text-xs leading-5 text-black/55">Browse by format, culture, collection or design language.</p></div><div className="rounded-[8px] bg-[#efe8dc] p-5"><IconShieldCheck size={21} className="text-[#e34d2e]" /><h3 className="mt-8 text-sm font-black">Review the details</h3><p className="mt-2 text-xs leading-5 text-black/55">Choose the right variant, material, size and finish.</p></div><div className="rounded-[8px] bg-[#efe8dc] p-5"><IconPackage size={21} className="text-[#e34d2e]" /><h3 className="mt-8 text-sm font-black">Make it yours</h3><p className="mt-2 text-xs leading-5 text-black/55">Studio-reviewed orders are packed and dispatched with care.</p></div></div></section>
        <section className="border-t border-black/10 py-12 text-center"><p className="text-sm text-black/55">Product details and availability are confirmed before fulfillment in this preview store.</p><Link href="/store/contact" className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#e34d2e]">Talk to Zerocraft <IconArrowUpRight size={15} /></Link></section>
      </div>
    </div>
  );
}
