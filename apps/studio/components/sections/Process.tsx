"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Container from "@/components/ui/Container";
import StudioGlyph from "@/components/ui/StudioGlyph";

const steps = [
  {
    number: "01",
    phase: "Research / Direction",
    glyph: "discover" as const,
    title: "Discover & Define",
    description: "We begin by understanding your goals, audience, and vision, building a clear foundation for the creative direction.",
  },
  {
    number: "02",
    phase: "Ideas / Systems",
    glyph: "explore" as const,
    title: "Explore & Design",
    description: "We turn insights into creative concepts, thoughtful visual systems, and intuitive experiences.",
  },
  {
    number: "03",
    phase: "Design / Build",
    glyph: "craft" as const,
    title: "Craft & Develop",
    description: "We bring ideas to life through detailed design, visual storytelling, and modern development.",
  },
  {
    number: "04",
    phase: "Polish / Launch",
    glyph: "deliver" as const,
    title: "Refine & Deliver",
    description: "We review, refine, and prepare every detail to deliver a cohesive final experience.",
  },
];

export default function Process() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      const route = section.querySelector<HTMLElement>(".process__route-progress");
      const items = gsap.utils.toArray<HTMLElement>(".process__step");
      if (!route || !items.length) return;

      const media = gsap.matchMedia();
      media.add("(min-width: 1100px)", () => {
        gsap.fromTo(route, { scaleX: 0 }, {
          scaleX: 1, duration: 1.25, ease: "power2.out",
          scrollTrigger: { trigger: section, start: "top 72%", once: true },
        });
      });
      media.add("(max-width: 1099px)", () => {
        gsap.fromTo(route, { scaleY: 0 }, {
          scaleY: 1, duration: 1.3, ease: "power2.out",
          scrollTrigger: { trigger: section, start: "top 72%", once: true },
        });
      });
      gsap.from(items, {
        y: 28, opacity: 0, duration: .7, ease: "power2.out", stagger: .13,
        scrollTrigger: { trigger: section, start: "top 72%", once: true },
      });
      return () => media.revert();
    }, section);

    return () => context.revert();
  }, []);

  return (
    <section ref={sectionRef} className="section process process--route" id="process" aria-labelledby="process-heading">
      <Container>
        <div className="process__header">
          <span className="studio-eyebrow studio-eyebrow--section">Our process</span>
          <h2 className="section-heading" id="process-heading">From first thought<br />to final form.</h2>
          <p className="process__intro">A clear path from the first conversation to the final detail. Each phase brings strategy, design, and craft closer together.</p>
        </div>

        <div className="process__timeline" aria-label="Our four-stage creative process">
          <div className="process__route" aria-hidden="true"><span className="process__route-progress" /></div>
          {steps.map((step) => (
            <article className="process__step" key={step.number}>
              <div className="process__symbol" aria-hidden="true"><StudioGlyph variant={step.glyph} size={39} /></div>
              <div className="process__node" aria-hidden="true">{step.number}</div>
              <div className="process__step-content">
                <span className="process__step-phase">{step.phase}</span>
                <h3 className="process__step-title">{step.title}</h3>
                <p className="process__step-description">{step.description}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="process__endnote" aria-hidden="true"><span>01—04 / STUDIO METHOD</span><span>ZEROCRAFT / PROCESS</span></div>
      </Container>
    </section>
  );
}
