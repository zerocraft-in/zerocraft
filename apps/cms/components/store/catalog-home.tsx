import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/store/ProductCard";
import StoreHeroSlider from "@/components/store/StoreHeroSlider";
import StoreNewsletterSignup from "@/components/store/StoreNewsletterSignup";
import { IconChevronDown, IconArrowUpRight } from "@/components/store/StoreIcon";
import type { CatalogCategory, CatalogCollection, CatalogProduct } from "@/lib/commerce/catalog";

type CatalogHomeProps = { products: CatalogProduct[]; categories: CatalogCategory[]; collections: CatalogCollection[] };
const fallbackImage = "/og-image.jpg";
const faqs = [
  ["Are the designs original?", "Zerocraft Originals are developed in-house. Licensed or fan-inspired work is labelled wherever it appears."],
  ["How long does dispatch take?", "Most studio-reviewed orders are packed within 2–4 working days. Made-to-order pieces may take a little longer."],
  ["Can I return a frame or apparel piece?", "Unused and undamaged products can be requested for return within the published return window. Personalised items are handled separately."],
  ["Do you ship across India?", "Yes. We ship from Tenkasi, Tamil Nadu, with delivery updates shared after dispatch."],
];

function categoryImage(category: CatalogCategory, products: CatalogProduct[]) {
  return products.find((product) => product.categorySlug === category.slug)?.images[0] || category.image || fallbackImage;
}

export default function CatalogHome({ products, categories, collections }: CatalogHomeProps) {
  const posterImage = products.find((product) => product.categorySlug === "posters")?.images[0] || fallbackImage;
  const apparelImage = products.find((product) => product.categorySlug === "t-shirts")?.images[0] || "/images/products/catalog/tee-cut-to-feeling.png";
  const frameImage = products.find((product) => product.categorySlug === "photo-frames")?.images[0] || "/images/products/catalog/photo-frame-quiet.png";
  const collectionCards = collections.length ? collections : categories.slice(0, 6).map((category) => ({ id: category.id, name: category.name, slug: category.slug, tagline: category.description, description: category.description, image: category.image }));

  return (
    <main className="min-h-screen overflow-hidden bg-[#f8f7f3] text-[#151515]">
      <StoreHeroSlider products={products} />

      <div className="store-signal-strip" aria-label="Zerocraft store highlights">
        <div className="store-signal-strip__track">
          <span>ZEROCRAFT SUPPLY CO.</span><i>✳</i><span>PRINTS / OBJECTS / APPAREL</span><i>✳</i><span>MADE IN TENKASI, INDIA</span><i>✳</i><span>ZEROCRAFT SUPPLY CO.</span><i>✳</i><span>PRINTS / OBJECTS / APPAREL</span><i>✳</i><span>MADE IN TENKASI, INDIA</span><i>✳</i>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-14" aria-label="Shop by category">
        <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#e34d2e]">01 / Start with a format</p><h2 className="mt-2 text-3xl font-black tracking-[-.06em] sm:text-5xl">Make room for a good story.</h2><p className="mt-3 max-w-lg text-sm leading-6 text-black/55">Choose a piece that brings a little more character to the wall, the wardrobe or the everyday carry.</p></div><Link href="/store/shop" className="hidden items-center gap-2 text-[10px] font-black uppercase tracking-wider text-black/55 hover:text-black sm:flex">Shop all <IconArrowUpRight size={15} /></Link></div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">{categories.slice(0, 6).map((category) => <Link key={category.id} href={`/store/category/${category.slug}`} className="group relative aspect-[1.15] overflow-hidden rounded-[8px] bg-[#ddd4c7]"><Image src={categoryImage(category, products)} alt={category.name} fill sizes="(max-width: 768px) 50vw, 16vw" className="object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" /><div className="absolute inset-x-3 bottom-3 text-white"><strong className="block text-sm font-black tracking-tight">{category.name}</strong><span className="mt-1 block text-[9px] uppercase tracking-wider text-white/70">{category.itemCount || "Curated"} pieces <span className="float-right text-base">→</span></span></div></Link>)}</div>
      </section>

      <section className="store-urban-panel mx-auto max-w-7xl px-5 pb-14 sm:px-8 lg:px-14" aria-labelledby="trending-heading">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#e34d2e]">The current edit</p><h2 id="trending-heading" className="mt-2 text-4xl font-black tracking-[-.06em] sm:text-6xl">Trending <span className="text-[#e34d2e]">now.</span></h2></div><Link href="/store/shop" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-black/55 hover:text-black">View all <IconArrowUpRight size={15} /></Link></div>
        <div className="mt-7 flex gap-2 overflow-x-auto pb-2 text-[10px] font-bold uppercase tracking-wider">{["All", ...categories.slice(0, 5).map((category) => category.name)].map((label) => <Link key={label} href={label === "All" ? "/store/shop" : `/store/shop?category=${categories.find((category) => category.name === label)?.slug}`} className={`whitespace-nowrap rounded-full px-4 py-2 ${label === "All" ? "bg-black text-white" : "border border-black/10 bg-white text-black/55"}`}>{label}</Link>)}</div>
        {products.length ? <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">{products.slice(0, 8).map((product, index) => <ProductCard key={product.id} product={product} priority={index === 0} />)}</div> : <p className="mt-5 rounded-[8px] border border-black/10 bg-white p-12 text-center text-sm text-black/55">The next catalog edit is being prepared.</p>}
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 pb-14 sm:px-8 lg:grid-cols-2 lg:px-14" aria-label="Editorial edits">
        <Link href="/store/shop?category=photo-frames" className="group relative min-h-[280px] overflow-hidden rounded-[8px] bg-[#1b1713] text-white"><Image src={frameImage} alt="Zerocraft photo frames" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover opacity-70 transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-r from-black/85 to-transparent" /><div className="relative flex min-h-[280px] flex-col justify-end p-7 sm:p-9"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#f5b544]">Make it personal</p><h2 className="mt-2 max-w-xs text-3xl font-black tracking-[-.05em]">Frames for your favourite scenes.</h2><span className="mt-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">Explore frames <IconArrowUpRight size={15} /></span></div></Link>
        <Link href="/store/shop?category=t-shirts" className="group relative min-h-[280px] overflow-hidden rounded-[8px] bg-[#1b1713] text-white"><Image src={apparelImage} alt="Zerocraft original apparel" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover opacity-70 transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-r from-black/85 to-transparent" /><div className="relative flex min-h-[280px] flex-col justify-end p-7 sm:p-9"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#f5b544]">Wear the culture</p><h2 className="mt-2 max-w-xs text-3xl font-black tracking-[-.05em]">Original graphics for the everyday edit.</h2><span className="mt-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">Shop apparel <IconArrowUpRight size={15} /></span></div></Link>
      </section>

      <section id="collections" className="mx-auto max-w-7xl px-5 pb-14 sm:px-8 lg:px-14" aria-labelledby="collections-heading"><div className="mb-6"><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#e34d2e]">Curated collections</p><h2 id="collections-heading" className="mt-2 text-4xl font-black tracking-[-.06em] sm:text-5xl">Stories for your <span className="text-[#e34d2e]">wall.</span></h2></div><div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">{collectionCards.slice(0, 6).map((collection) => <Link key={collection.id} href={`/store/shop?collection=${collection.slug}`} className="group relative aspect-square overflow-hidden rounded-[8px] bg-[#cfc4b5]"><Image src={collection.image || posterImage} alt={collection.name} fill sizes="(max-width: 768px) 50vw, 16vw" className="object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" /><strong className="absolute inset-x-3 bottom-3 text-sm font-black leading-tight text-white">{collection.name}<span className="mt-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-white/65">Explore <IconArrowUpRight size={12} /></span></strong></Link>)}</div></section>

      <section className="mx-auto max-w-4xl px-5 py-16 sm:px-8 lg:py-24" aria-labelledby="faq-heading"><div className="mb-8 text-center"><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#e34d2e]">Questions, answered</p><h2 id="faq-heading" className="mt-3 text-4xl font-black tracking-[-.06em] sm:text-6xl">Made to feel <span className="text-[#e34d2e]">easy.</span></h2></div><div className="divide-y divide-black/10 rounded-[8px] border border-black/10 bg-white/70 px-5">{faqs.map(([question, answer], index) => <details key={question} className="group"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-sm font-black"><span className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#f1ece3] text-[10px] text-[#e34d2e]">{String(index + 1).padStart(2, "0")}</span>{question}</span><IconChevronDown size={17} className="transition-transform group-open:rotate-180" /></summary><p className="max-w-2xl pb-5 pl-11 text-sm leading-6 text-black/60">{answer}</p></details>)}</div></section>

      <section className="border-y border-black/10 bg-white/75"><div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-7 text-center sm:grid-cols-4 sm:px-8 lg:px-14"><div><strong className="block text-xs font-black uppercase tracking-wider">Free shipping</strong><span className="mt-1 block text-[10px] text-black/50">On orders above ₹999</span></div><div><strong className="block text-xs font-black uppercase tracking-wider">Easy returns</strong><span className="mt-1 block text-[10px] text-black/50">7-day return policy</span></div><div><strong className="block text-xs font-black uppercase tracking-wider">Secure checkout</strong><span className="mt-1 block text-[10px] text-black/50">Clear totals and updates</span></div><div><strong className="block text-xs font-black uppercase tracking-wider">Made in India</strong><span className="mt-1 block text-[10px] text-black/50">Studio printed with care</span></div></div></section>

      <section className="relative isolate overflow-hidden bg-[#181411] px-5 py-14 text-white sm:px-8 lg:px-14"><Image src={posterImage} alt="Original Zerocraft print detail" fill sizes="100vw" className="-z-10 object-cover opacity-25" /><div className="absolute inset-0 -z-10 bg-black/65" /><div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#f5b544]">Join the creative space</p><h2 className="mt-2 text-3xl font-black tracking-[-.05em]">New drops, studio notes, good stories.</h2><p className="mt-2 max-w-md text-sm text-white/60">One considered note when something worth collecting leaves the print table.</p></div><StoreNewsletterSignup /></div></section>
    </main>
  );
}
