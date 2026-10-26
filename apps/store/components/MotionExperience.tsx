'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
gsap.registerPlugin(ScrollToPlugin);
export default function MotionExperience() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const handler = (event: MouseEvent) => { const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]'); const href = anchor?.getAttribute('href'); if (!href || href === '#') return; const target = document.getElementById(href.slice(1)); if (!target) return; event.preventDefault(); gsap.to(window, { duration: 1.05, scrollTo: { y: target, offsetY: 78 }, ease: 'power3.inOut' }); };
    document.addEventListener('click', handler); return () => document.removeEventListener('click', handler);
  }, []);
  useEffect(() => { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; window.scrollTo(0, 0); }, [pathname]);
  return null;
}
