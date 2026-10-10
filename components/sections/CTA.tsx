"use client";

import Reveal from "@/components/ui/Reveal";
import Container from "@/components/ui/Container";
import BadgeButton from "@/components/ui/BadgeButton";

export default function CTA() {
  return (
    <section className="section cta" id="contact">
      <Container>
        <div className="cta__wrapper">
          <div className="cta__eyebrow-row">
            <span className="studio-eyebrow">/ Let’s work together</span>

          </div>
          <Reveal delay={0}>
            <h2 className="cta__heading">Have an idea?<br />Let’s make it <span className="studio-accent">remarkable.</span></h2>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="cta__description">Every great project begins with a conversation. Share your vision, and let’s explore what we can create together.</p>
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
