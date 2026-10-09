"use client";

import { useState } from "react";
import Reveal from "@/components/ui/Reveal";
import Container from "@/components/ui/Container";
import BadgeButton from "@/components/ui/BadgeButton";

export default function CTA() {
  const [wordsPaused, setWordsPaused] = useState(false);
  return (
    <section className="section cta" id="contact">
      <Container>
        <div className="cta__wrapper">
          <div className="cta__eyebrow-row">
            <span className="studio-eyebrow">/ Let’s work together</span>
            <button type="button" className="cta__motion-toggle" onClick={() => setWordsPaused(!wordsPaused)} aria-label={wordsPaused ? "Play word animation" : "Pause word animation"} aria-pressed={wordsPaused}>
              {wordsPaused ? "Play motion ↗" : "Pause motion Ⅱ"}
            </button>
          </div>
          <Reveal delay={0}>
            <h2 className="cta__heading" aria-label="Have an idea? Let’s get together.">
              Have an idea?
              <br />
              Let’s get{" "}
              <span className={`cta__rotating-words studio-accent${wordsPaused ? " cta__rotating-words--paused" : ""}`} aria-hidden="true">
                {["together.", "building.", "moving."].map((word) => <span key={word}>{word}</span>)}
              </span>
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="cta__description">
              Crafting authentic digital experiences with design, code &amp; story.
              Based in Tenkasi, collaborating worldwide. Let's build the future together.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="cta__btn-wrapper">
              <BadgeButton href="/contact" text="START A PROJECT" />
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
