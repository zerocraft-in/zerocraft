"use client";

import { useState, type MouseEvent } from "react";
import type Lenis from "lenis";
import BadgeButton from "@/components/ui/BadgeButton";

const messages = [
  ["Unlock your", "brand’s", "personality."],
  ["Build your next", "digital", "experience."],
  ["Turn your", "ideas into", "impact."],
];

export default function Hero() {
  const [paused, setPaused] = useState(false);
  function explore(event: MouseEvent<HTMLAnchorElement>) {
    const target = document.getElementById("works");
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    history.pushState(null, "", "#works");
    const lenis = (window as unknown as { lenis?: Lenis }).lenis;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const focusTarget = () => target.focus({ preventScroll: true });
    if (lenis) {
      lenis.scrollTo(target, { offset: -88, immediate: reducedMotion, onComplete: focusTarget });
    } else {
      target.scrollIntoView({ behavior: reducedMotion ? "instant" : "smooth", block: "start" });
      focusTarget();
    }
  }
  return (
    <section className="hero hero--canvas" aria-label="Zerocraft Studio introduction">
      <div className="hero__grid" aria-hidden="true" />
      <span className="hero__canvas-note hero__canvas-note--left" aria-hidden="true">Independent thinking.<br />Intentional design.</span>
      <span className="hero__canvas-note hero__canvas-note--right" aria-hidden="true">Design + Code + Story<br />From idea to impact.</span>
      <div className="hero__content">
        <div className="hero__studio-label"><span className="hero__status-dot" aria-hidden="true" /> Zerocraft / Digital Studio</div>
        <h1 className={`hero__headline${paused ? " hero__headline--paused" : ""}`} aria-label="Unlock your brand’s personality. Design, development, and storytelling by Zerocraft Studio.">
          {messages.map((lines) => <span className="hero__headline-slide" key={lines[2]} aria-hidden="true">
            <span>{lines[0]}</span><span>{lines[1]}</span><span className="studio-accent">{lines[2]}</span>
          </span>)}
        </h1>
        <p className="hero__intro">We craft digital experiences that connect,<br className="hero__desktop-break" /> inspire, and evolve with your brand.</p>
        <div className="hero__actions"><BadgeButton href="/contact" text="LET’S CREATE MAGIC" /><a className="hero__work-link" href="#works" onClick={explore}>Explore our work ↗</a></div>
        <button type="button" className="hero__motion-toggle" onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? "Play headline animation" : "Pause headline animation"}>{paused ? "Play motion ↗" : "Pause motion Ⅱ"}</button>
      </div>
      <div className="hero__bottom">
        <a className="hero__bottom-item hero__bottom-left" href="https://instagram.com/studio.zerocraft" target="_blank" rel="noopener noreferrer">@STUDIO.ZEROCRAFT</a>
        <div className="hero__location"><strong>Creative development agency</strong><span><i aria-hidden="true" /> Tenkasi, India <span aria-hidden="true">↗</span></span></div>
        <a className="hero__bottom-item hero__scroll" href="#works" onClick={explore}>
          <span className="hero__scroll-text-full">SCROLL TO EXPLORE</span><span className="hero__scroll-text-short">EXPLORE</span>
          <svg viewBox="0 0 18 18" width="16" height="16" className="hero__scroll-arrow" aria-hidden="true"><path fill="currentColor" d="M18,10.8h-3.6v-3.6h3.6v3.6ZM7.2,14.4v3.6h3.6v-3.6h3.6v-3.6h-3.6V0h-3.6v10.8h-3.6v3.6s3.6,0,3.6,0ZM3.6,10.8v-3.6H0v3.6h3.6Z" /></svg>
        </a>
      </div>
    </section>
  );
}
