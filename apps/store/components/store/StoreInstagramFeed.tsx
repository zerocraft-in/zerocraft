import Image from "next/image";
import Link from "next/link";
import { IconInstagram, IconPinterest, IconYoutube } from "@/components/store/StoreIcon";
import type { CatalogProduct } from "@/lib/commerce/catalog";

const fallbackImages = [
  "/images/products/catalog/poster-frame-of-mind.png",
  "/images/products/catalog/photo-frame-quiet.png",
  "/images/products/catalog/tee-cut-to-feeling.png",
  "/images/products/catalog/hoodie-signal.png",
  "/images/products/catalog/print-colour-scenes.png",
  "/images/products/catalog/tote-matinee.png",
];

export default function StoreInstagramFeed({ products }: { products: CatalogProduct[] }) {
  const feed = Array.from({ length: 6 }, (_, index) => ({
    image: products[index]?.images?.[0] || fallbackImages[index],
    title: products[index]?.title || ["Print table", "Frame study", "Everyday uniform", "Studio signal", "Colour notes", "Packed with care"][index],
  }));

  return (
    <section className="store-instagram-feed relative overflow-hidden border-y border-black/10 bg-[#efe8dc]">
      <div className="store-instagram-feed__ring" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-14 lg:py-20">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#e34d2e]">Instagram / studio feed</p><h2 className="mt-3 max-w-lg font-secondary text-4xl font-bold leading-[.95] tracking-[-.05em] sm:text-6xl">From the print table to your <span className="text-[#e34d2e]">feed.</span></h2><p className="mt-4 max-w-md text-sm leading-6 text-black/60">A quiet look at new drops, material tests and the objects we keep making.</p></div>
          <div className="flex flex-wrap items-center gap-2"><Link href="https://www.instagram.com/" className="inline-flex w-fit items-center gap-2 rounded-[5px] border border-black/15 bg-white/65 px-4 py-3 text-[10px] font-black uppercase tracking-wider transition hover:border-[#e34d2e] hover:text-[#e34d2e]"><IconInstagram size={16} /> Follow the studio</Link><Link href="https://www.youtube.com/" aria-label="Zerocraft YouTube" className="grid h-10 w-10 place-items-center rounded-[5px] border border-black/15 bg-white/65 transition hover:border-[#e34d2e] hover:text-[#e34d2e]"><IconYoutube size={16} /></Link><Link href="https://www.pinterest.com/" aria-label="Zerocraft Pinterest" className="grid h-10 w-10 place-items-center rounded-[5px] border border-black/15 bg-white/65 transition hover:border-[#e34d2e] hover:text-[#e34d2e]"><IconPinterest size={16} /></Link></div>
        </div>
        <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{feed.map((item, index) => <Link href="https://www.instagram.com/" key={`${item.title}-${index}`} className={`store-instagram-feed__tile group relative aspect-square overflow-hidden rounded-[8px] border border-black/10 ${index % 3 === 1 ? "translate-y-3" : ""}`}><Image src={item.image} alt={item.title} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw" className="object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-80" /><div className="absolute inset-x-3 bottom-3 text-white"><span className="block text-[9px] font-black uppercase tracking-wider">{item.title}</span><span className="mt-1 flex items-center gap-1 text-[9px] text-white/65">View post <span>↗</span></span></div></Link>)}</div>
      </div>
    </section>
  );
}
