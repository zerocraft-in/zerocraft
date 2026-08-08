"use client";

import Reveal from "@/components/ui/Reveal";
import Container from "@/components/ui/Container";

const steps = [
  {
    number: "01",
    title: "Discovery & Strategy",
    description:
      "We begin by understanding your business, goals, and audience. This deep dive informs a strategic foundation that aligns our creative vision with your objectives.",
  },
  {
    number: "02",
    title: "Concept & Design",
    description:
      "Our design team translates strategy into visual concepts. Through iterative exploration, we craft intuitive and beautiful designs that elevate your brand.",
  },
  {
    number: "03",
    title: "Development & Build",
    description:
      "Our engineers bring designs to life using modern technologies, ensuring optimal performance, accessibility, and seamless animations across all devices.",
  },
  {
    number: "04",
    title: "Launch & Iterate",
    description:
      "After rigorous testing, we launch your product to the world. We continue to monitor, refine, and iterate to ensure sustained success and growth.",
  },
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
              <h2 className="section-heading">How we bring ideas to life.</h2>
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
