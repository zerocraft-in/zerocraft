"use client";

import Reveal from "@/components/ui/Reveal";
import Container from "@/components/ui/Container";

const steps = [
  {
    "number": "01",
    "title": "Discover & Define",
    "description": "We begin by understanding your goals, audience, and vision, building a clear foundation for the creative direction."
  },
  {
    "number": "02",
    "title": "Explore & Design",
    "description": "We turn insights into creative concepts, thoughtful visual systems, and intuitive experiences."
  },
  {
    "number": "03",
    "title": "Craft & Develop",
    "description": "We bring ideas to life through detailed design, visual storytelling, and modern development."
  },
  {
    "number": "04",
    "title": "Refine & Deliver",
    "description": "We review, refine, and prepare every detail to deliver a cohesive final experience."
  }
];

export default function Process() {
  return (
    <section className="section process" id="process">
      <Container>
        <div className="process__grid">
          {/* Left: Heading */}
          <div className="process__header">
            <Reveal>
              <span className="process__label text-label">Our Process</span>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="section-heading">From first thought to final form.</h2>
            </Reveal>
          </div>

          {/* Right: Timeline */}
          <div className="process__timeline">
            {steps.map((step, index) => (
              <div key={step.number} className="process__step">
                <Reveal delay={0.1 * index} className="process__step-inner">
                  <div className="process__step-number">{step.number}</div>
                  <div className="process__step-content">
                    <h3 className="process__step-title">{step.title}</h3>
                    <p className="process__step-description">
                      {step.description}
                    </p>
                  </div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
