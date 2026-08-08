"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function DemoNavbar() {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.fromTo(
      navRef.current,
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: "power3.out", delay: 0.2 }
    );
  }, []);

  return (
    <header
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 mt-2 max-w-[1400px] mx-auto"
    >
      <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter">
        <div className="w-6 h-6 rounded-full bg-emerald-400"></div>
        kora<span className="text-sm align-top text-gray-400 font-medium">™</span>
      </div>

      <nav className="hidden md:flex items-center kora-pill-nav px-2 py-1.5 gap-2">
        <Link href="#" className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-full transition-colors">Case studies</Link>
        <Link href="#" className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-full transition-colors">Insights</Link>
        <Link href="#" className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-full transition-colors">About us</Link>
        <Link href="#" className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-full transition-colors">Contact</Link>
      </nav>

      <div className="flex items-center">
        <button className="flex items-center gap-2 bg-[#1E1F1E] text-white px-5 py-2.5 rounded-full font-medium text-sm hover:bg-black transition-colors">
          Book a call
          <img 
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop" 
            alt="Avatar" 
            className="w-6 h-6 rounded-full object-cover"
          />
        </button>
      </div>
    </header>
  );
}
