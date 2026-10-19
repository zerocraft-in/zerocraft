"use client";

import Reveal from "@/components/ui/Reveal";
import Container from "@/components/ui/Container";
import BadgeButton from "@/components/ui/BadgeButton";
import RotatingWords from "@/components/ui/RotatingWords";
import ArrowIcon from "@/components/ui/ArrowIcon";

export default function CTA() {
  return (
    <section className="section cta" id="contact">
      <Container>
        <div className="cta__wrapper">
          <div className="cta__eyebrow-row">
            <span className="studio-eyebrow studio-eyebrow--section">Let’s work together</span>
          </div>
          <Reveal delay={0}>
            <h2 className="cta__heading" aria-label="Have an idea? Let’s make it remarkable.">
              Have an idea?
              <br />
              Let’s make it <RotatingWords words={["remarkable.", "memorable.", "meaningful."]} className="studio-accent" />
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="cta__description">
              Every great project begins with a conversation. Share your vision,
              and let’s explore what we can create together.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="cta__btn-wrapper">
              <BadgeButton href="/contact" text="START A PROJECT" />
            </div>
          </Reveal>
          <div className="cta__seal" aria-hidden="true"><span>YOUR NEXT BIG IDEA</span><ArrowIcon direction="down" size={22} /></div>
        </div>
      </Container>
    </section>
  );
}
