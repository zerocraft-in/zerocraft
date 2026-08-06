"use client";

import Reveal from "@/components/ui/Reveal";
import Container from "@/components/ui/Container";

export default function CTA() {
  return (
    <section className="section cta" id="contact">
      <Container>
        <div className="cta__wrapper">
          <Reveal delay={0}>
            <h2 className="cta__heading">
              Have an idea?
              <br />
              Let's build it together.
            </h2>
          </Reveal>
          
          <Reveal delay={0.1}>
            <p className="cta__description">
              We're always looking for new challenges and exciting projects.
              Reach out and let's start a conversation.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <a href="/contact" className="btn btn--filled cta__btn">
              Get in Touch
              <span className="btn__arrow" aria-hidden="true">→</span>
            </a>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
