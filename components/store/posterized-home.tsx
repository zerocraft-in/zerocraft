"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatePresence, motion } from "framer-motion";
import { IconArrowLeft, IconArrowRight, IconArrowUpRight, IconChevronDown, IconCircleCheck, IconSparkles } from "@tabler/icons-react";
import type { CatalogProduct } from "@/lib/commerce/catalog";
import ProductCard from "@/components/store/ProductCard";

gsap.registerPlugin(ScrollTrigger);

type Props = { products: CatalogProduct[] };

const packs = [
  { name: "Compact wall", count: "5 prints", price: "From ₹399", tag: "Starter", className: "bg-[#dbe7d9]" },
  { name: "Studio wall", count: "10 prints", price: "From ₹549", tag: "Level up", className: "bg-[#e9ded0]" },
  { name: "Large wall", count: "17 prints", price: "From ₹699", tag: "Most popular", className: "bg-[#dce2ea]" },
  { name: "Hero wall", count: "20 prints", price: "From ₹849", tag: "Main character", className: "bg-[#ead9d5]" },
];

const categories = ["Music", "Aesthetic", "Anime", "Cars", "Superheroes", "Gaming", "Sports & F1", "Hollywood"];
const heroSlides = [
  { eyebrow: "Posterized / Print studio", title: <>Make your wall <span className="text-[#e34d2e]">loud.</span></>, copy: "Build a poster wall that feels like you. Pick a layout, choose your art, and we'll print it beautifully.", image: "/images/products/posterized-art-print-mockup.png", label: "The colour study" },
  { eyebrow: "Posterized / Wearable drops", title: <>Wear your <span className="text-[#e34d2e]">point of view.</span></>, copy: "Graphic tees, matching sets, and screen-printed pieces made for everyday rotation.", image: "/images/products/posterized-tee-drop.png", label: "The tee drop" },
  { eyebrow: "Posterized / Custom studio", title: <>Your idea, <span className="text-[#e34d2e]">printed.</span></>, copy: "Upload your artwork, arrange the composition, and turn a blank surface into something personal.", image: "/images/products/posterized-merch-collection.png", label: "Custom studio" },
];
const faqs = [
  ["How it works", "Choose a product, select your variant, and add it to cart. Custom products can be edited before you submit the order request."],
  ["What paper do you use?", "Our art prints use heavyweight 300 GSM matte paper with a soft archival finish."],
  ["Can I upload my own artwork?", "Yes. Use the custom product editor to upload a PNG, JPG, or WebP and preview your composition."],
  ["How are orders packaged?", "Every order is checked, rolled or folded carefully, and protected for the journey home."],
  ["How long does shipping take?", "Products are made to order and dispatched after studio confirmation. Delivery updates are shared with your order."],
  ["Can I change an order?", "Contact the studio as soon as possible. Changes are possible before production begins."],
];

export default function PosterizedHome({ products }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setActiveSlide((slide) => (slide + 1) % heroSlides.length), 6000);
    return () => window.clearInterval(timer);
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".posterized-hero-copy > *", { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: "power3.out" });
      gsap.fromTo(".posterized-hero-art", { scale: 0.92, opacity: 0, y: 28 }, { scale: 1, opacity: 1, y: 0, duration: 1.1, delay: 0.2, ease: "power3.out" });
      gsap.to(".posterized-hero-art img", { yPercent: -7, ease: "none", scrollTrigger: { trigger: ".posterized-hero", start: "top top", end: "bottom top", scrub: true } });
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        gsap.fromTo(element, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, ease: "power3.out", scrollTrigger: { trigger: element, start: "top 88%", once: true } });
      });
      gsap.to(".posterized-marquee-track", { xPercent: -18, duration: 22, ease: "none", repeat: -1 });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="bg-[#f8f7f3] text-[#151515] overflow-hidden">
      <section className="posterized-hero relative mx-auto grid max-w-[1440px] gap-10 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20 lg:px-14 lg:pb-24 lg:pt-20">
        <div className="posterized-hero-copy relative z-10 max-w-xl">
          <p className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#e34d2e]"><IconSparkles size={15} /> {heroSlides[activeSlide].eyebrow}</p>
          <AnimatePresence mode="wait"><motion.h1 key={activeSlide} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} transition={{ duration: 0.35 }} className="max-w-2xl text-[clamp(3.5rem,8vw,8.5rem)] font-black leading-[0.82] tracking-[-0.075em]">{heroSlides[activeSlide].title}</motion.h1></AnimatePresence>
          <AnimatePresence mode="wait"><motion.p key={`copy-${activeSlide}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="mt-8 max-w-md text-base leading-7 text-[#151515]/65 sm:text-lg">{heroSlides[activeSlide].copy}</motion.p></AnimatePresence>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#build-your-wall" className="inline-flex items-center gap-3 rounded-full bg-[#171717] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-white transition-transform hover:-translate-y-1">Build your wall <IconArrowUpRight size={17} /></Link>
            <Link href="/store/shop" className="inline-flex items-center gap-3 rounded-full border border-[#171717]/20 px-6 py-3.5 text-xs font-bold uppercase tracking-[0.12em] transition-colors hover:bg-white">Shop prints</Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#151515]/55">
            <span className="flex items-center gap-2"><IconCircleCheck size={15} className="text-[#198754]" /> 300 GSM paper</span>
            <span className="flex items-center gap-2"><IconCircleCheck size={15} className="text-[#198754]" /> Easy to customize</span>
          </div>
          <div className="mt-8 flex items-center gap-2"><button aria-label="Previous hero slide" onClick={() => setActiveSlide((activeSlide + heroSlides.length - 1) % heroSlides.length)} className="rounded-full border border-[#151515]/15 p-2 transition-colors hover:bg-white"><IconArrowLeft size={16} /></button><button aria-label="Next hero slide" onClick={() => setActiveSlide((activeSlide + 1) % heroSlides.length)} className="rounded-full border border-[#151515]/15 p-2 transition-colors hover:bg-white"><IconArrowRight size={16} /></button><div className="ml-2 flex gap-1.5">{heroSlides.map((slide, index) => <button key={slide.label} aria-label={`Show slide ${index + 1}`} onClick={() => setActiveSlide(index)} className={`h-1.5 rounded-full transition-all ${activeSlide === index ? "w-8 bg-[#e34d2e]" : "w-1.5 bg-[#151515]/20"}`} />)}</div></div>
        </div>
        <div className="posterized-hero-art relative mx-auto aspect-[0.95] w-full max-w-[680px] overflow-hidden rounded-[2rem] bg-[#d9d4cc] shadow-[0_30px_80px_rgba(20,20,20,.16)]">
          <AnimatePresence mode="wait"><motion.div key={activeSlide} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .98 }} transition={{ duration: .65, ease: "easeOut" }} className="absolute inset-0"><Image src={heroSlides[activeSlide].image} alt={heroSlides[activeSlide].label} fill priority={activeSlide === 0} sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover scale-[1.06]" /></motion.div></AnimatePresence>
          <div className="absolute inset-x-5 bottom-5 flex items-end justify-between rounded-2xl border border-white/30 bg-white/80 p-4 backdrop-blur-md sm:inset-x-7 sm:bottom-7">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e34d2e]">Featured now</p><p className="mt-1 text-sm font-black uppercase tracking-tight">{heroSlides[activeSlide].label}</p></div>
            <Link href={activeSlide === 2 ? "/store/shop?category=customized-gifts" : "/store/shop"} className="rounded-full bg-[#171717] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white">Explore</Link>
          </div>
        </div>
      </section>

      <div className="border-y border-[#151515]/10 bg-white py-4">
        <div className="posterized-marquee-track flex min-w-max gap-10 text-[11px] font-black uppercase tracking-[0.2em] text-[#151515]/50 sm:gap-16">
          {["Made for your walls", "Print. Pack. Repeat.", "Design it your way", "Posterized originals", "Made for your walls", "Print. Pack. Repeat."].map((item, index) => <span key={`${item}-${index}`} className="flex items-center gap-10 sm:gap-16">{item}<b className="text-[#e34d2e]">✦</b></span>)}
        </div>
      </div>

      <section id="build-your-wall" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-14 lg:py-28">
        <div data-reveal className="mb-10 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#e34d2e]">01 / Start here</p><h2 className="text-4xl font-black tracking-[-0.06em] sm:text-6xl">Build your wall.</h2></div><p className="max-w-sm text-sm leading-6 text-[#151515]/60">Choose a layout first. You can swap every poster later, so there&apos;s no wrong way to start.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {packs.map((pack, index) => <Link data-reveal href="/store/shop?category=posters" key={pack.name} className={`group relative min-h-[300px] overflow-hidden rounded-3xl ${pack.className} p-5 transition-transform duration-500 hover:-translate-y-2`}>
            <div className="absolute inset-0 opacity-20 mix-blend-multiply"><Image src="/images/products/posterized-art-print-mockup.png" alt="" fill className="object-cover grayscale" /></div>
            <div className="relative flex h-full flex-col justify-between"><span className="w-fit rounded-full bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">{index === 2 ? "Most popular" : pack.tag}</span><div><div className="mb-5 grid grid-cols-3 gap-1.5 opacity-90">{Array.from({ length: index + 3 }).map((_, i) => <span key={i} className="aspect-[3/4] rounded-sm border-2 border-white/80 bg-white/70 shadow-sm" />)}</div><h3 className="text-2xl font-black tracking-tight">{pack.name}</h3><p className="mt-1 text-xs font-bold uppercase tracking-wider text-[#151515]/55">{pack.count} · {pack.price}</p><span className="mt-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider underline decoration-2 underline-offset-4">Choose layout <IconArrowUpRight size={14} /></span></div></div>
          </Link>)}
        </div>
      </section>

      <section data-reveal className="mx-auto max-w-[1440px] px-5 pb-20 sm:px-8 lg:px-14 lg:pb-28">
        <div className="rounded-[2rem] bg-[#e8e4dc] p-5 sm:p-8 lg:grid lg:grid-cols-[0.9fr_1.2fr] lg:items-center lg:gap-12 lg:p-12">
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#e34d2e]">02 / Made with intent</p>
            <h2 className="text-4xl font-black leading-none tracking-[-0.06em] sm:text-6xl">Crafted,<br /><span className="text-[#e34d2e]">not crowded.</span></h2>
            <p className="mt-6 max-w-sm text-sm leading-6 text-[#151515]/65">A small, considered collection of art, apparel, and custom pieces. Strong colour, tactile materials, and room for your own point of view.</p>
            <div className="mt-8 space-y-3">
              {["300 GSM matte paper", "Small-batch screen print", "Designed for everyday walls"].map((note, index) => <div key={note} className="flex items-center gap-3 border-t border-[#151515]/15 pt-3 text-xs font-black uppercase tracking-wider"><span className="text-[#e34d2e]">0{index + 1}</span>{note}</div>)}
            </div>
            <Link href="/store/shop?category=customized-gifts" className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#e34d2e] px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white transition-transform hover:-translate-y-1">Make a custom piece <IconArrowUpRight size={17} /></Link>
          </div>
          <div className="relative mt-8 aspect-[1.25] overflow-hidden rounded-2xl bg-[#c9c2b8] lg:mt-0"><Image src="/images/products/posterized-merch-collection.png" alt="Posterized merch and print collection" fill sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover" /><div className="absolute bottom-4 left-4 rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-wider shadow-lg">Upload → arrange → print</div></div>
        </div>
      </section>

      <section className="border-y border-[#151515]/10 bg-white px-5 py-20 sm:px-8 lg:px-14 lg:py-28">
        <div className="mx-auto max-w-[1440px]"><div data-reveal className="mb-10 flex items-end justify-between gap-5"><div><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#e34d2e]">03 / Shop the edit</p><h2 className="text-4xl font-black tracking-[-0.06em] sm:text-6xl">Fresh on the wall.</h2></div><Link href="/store/shop" className="hidden items-center gap-2 text-xs font-black uppercase tracking-wider underline underline-offset-4 sm:flex">View all <IconArrowUpRight size={15} /></Link></div><div className="mb-8 flex gap-2 overflow-x-auto pb-2">{categories.map((category, i) => <span key={category} className={`whitespace-nowrap rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-wider ${i === 0 ? "border-[#171717] bg-[#171717] text-white" : "border-[#151515]/15 text-[#151515]/65"}`}>{category}</span>)}</div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.slice(0, 8).map((product) => <ProductCard key={product.id} product={product} />)}</div></div>
      </section>

      <section data-reveal className="mx-auto max-w-[900px] px-5 py-20 sm:px-8 lg:py-28"><div className="mb-8 text-center"><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#e34d2e]">04 / The good stuff</p><h2 className="text-4xl font-black tracking-[-0.06em] sm:text-6xl">Made to feel easy.</h2></div><div className="divide-y divide-[#151515]/10 rounded-3xl border border-[#151515]/10 bg-white px-5">{faqs.map(([title, copy], index) => <div key={title}><button onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index} className="flex w-full items-center justify-between gap-4 py-5 text-left"><span className="flex items-center gap-3 text-sm font-black"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1efe9] text-[10px] text-[#e34d2e]">{String(index + 1).padStart(2, "0")}</span>{title}</span><IconChevronDown size={18} className={`transition-transform ${openFaq === index ? "rotate-180" : ""}`} /></button><div className={`grid transition-[grid-template-rows] duration-300 ${openFaq === index ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"}`}><p className="overflow-hidden pl-11 text-sm leading-6 text-[#151515]/60">{copy}</p></div></div>)}</div></section>
    </div>
  );
}
