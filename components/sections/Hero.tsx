"use client";

import { useState, type MouseEvent } from "react";
import type Lenis from "lenis";
import BadgeButton from "@/components/ui/BadgeButton";
import ArrowIcon from "@/components/ui/ArrowIcon";
import RotatingWords from "@/components/ui/RotatingWords";

const words = ["extraordinary.", "meaningful.", "memorable."];

export default function Hero() {
  const [paused, setPaused] = useState(false);
  function explore(event: MouseEvent<HTMLAnchorElement>) {
    const target = document.getElementById("works");
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    history.pushState(null, "", "#works");
    const lenis = (window as unknown as { lenis?: Lenis }).lenis;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const focusTarget = () => target.focus({ preventScroll: true });
    if (lenis) {
      lenis.scrollTo(target, {
        offset: -88,
        immediate: reducedMotion,
        onComplete: focusTarget,
      });
    } else {
      target.scrollIntoView({
        behavior: reducedMotion ? "instant" : "smooth",
        block: "start",
      });
      focusTarget();
    }
  }
  return (
    <section
      className="hero hero--canvas"
      aria-label="Zerocraft Studio introduction"
    >
      <div className="hero__grid" aria-hidden="true" />
      <span
        className="hero__canvas-note hero__canvas-note--left"
        aria-hidden="true"
      >
        Bold thinking.
        <br />
        Intentional design.
      </span>
      <span
        className="hero__canvas-note hero__canvas-note--right"
        aria-hidden="true"
      >
        DESIGN · CODE · STORY
      </span>
      <div className="hero__content">
        <div className="hero__studio-label">
          <span className="hero__status-dot" aria-hidden="true" /> ZEROCRAFT STUDIO / DESIGN · CODE · STORY
        </div>
        <h1
          className="hero__headline"
          aria-label="Ideas made bold. Experiences made extraordinary."
        >
          <span>Ideas made bold.</span>
          <span>Experiences made</span>
          <RotatingWords words={words} paused={paused} className="hero__word-window studio-accent" />
        </h1>
        <p className="hero__intro">
          We build distinctive brands, meaningful digital experiences, and
          compelling visual stories through design, technology, and creativity.
        </p>
        <div className="hero__actions">
          <BadgeButton href="/contact" text="START A PROJECT" />
          <a className="hero__work-link" href="#works" onClick={explore}>
            EXPLORE OUR WORK <ArrowIcon direction="up-right" size={12} />
          </a>
        </div>
        <button
          type="button"
          className="hero__motion-toggle"
          onClick={() => setPaused(!paused)}
          aria-pressed={paused}
          aria-label={
            paused ? "Play headline animation" : "Pause headline animation"
          }
        >
          {paused ? <>Play motion <ArrowIcon direction="up-right" size={10} /></> : "Pause motion Ⅱ"}
        </button>
      </div>
      <div className="hero__bottom">
        <a
          className="hero__bottom-item hero__bottom-left"
          href="https://instagram.com/studio.zerocraft"
          target="_blank"
          rel="noopener noreferrer"
        >
          @STUDIO.ZEROCRAFT
        </a>
        <div className="hero__location">
          <strong>Creative &amp; Digital Studio</strong>
          <span>
            <i aria-hidden="true" /> Tenkasi, India{" "}
            <ArrowIcon direction="up-right" size={10} />
          </span>
        </div>
        <a
          className="hero__bottom-item hero__scroll"
          href="#works"
          onClick={explore}
        >
          <span className="hero__scroll-text-full">SCROLL TO EXPLORE</span>
          <span className="hero__scroll-text-short">EXPLORE</span>
          <ArrowIcon size={16} className="hero__scroll-arrow" />
        </a>
      </div>
    </section>
  );
}
