"use client";
import { useEffect } from "react";

/** Reveals semantic storefront elements as they enter the viewport. */
export default function RevealInit() {
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); } }), { threshold: 0.08 });
    const scan = () => document.querySelectorAll(".reveal-on-scroll:not(.is-visible)").forEach((x) => io.observe(x));
    scan(); const mo = new MutationObserver(scan); mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
  return null;
}
