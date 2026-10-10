"use client";

import Reveal from "@/components/ui/Reveal";
import Container from "@/components/ui/Container";
import { motion, useReducedMotion } from "framer-motion";
import { IconSearch, IconPalette, IconCode, IconSparkles } from "@tabler/icons-react";
import ArrowIcon from "@/components/ui/ArrowIcon";

const steps = [
  {
    number: "01",
    phase: "Research / Direction",
    icon: IconSearch,
    title: "Discover & Define",
    description:
      "We begin by understanding your goals, audience, and vision, building a clear foundation for the creative direction.",
  },
  {
    number: "02",
    phase: "Ideas / Systems",
    icon: IconPalette,
    title: "Explore & Design",
    description:
      "We turn insights into creative concepts, thoughtful visual systems, and intuitive experiences.",
  },
  {
    number: "03",
    phase: "Design / Build",
    icon: IconCode,
    title: "Craft & Develop",
    description:
      "We bring ideas to life through detailed design, visual storytelling, and modern development.",
  },
  {
    number: "04",
    phase: "Polish / Launch",
    icon: IconSparkles,
    title: "Refine & Deliver",
    description:
      "We review, refine, and prepare every detail to deliver a cohesive final experience.",
  },
];

export default function Process() {
  const reducedMotion = useReducedMotion();
  return (
    <section className="section process" id="process" aria-labelledby="process-heading">
      <Container>
        <div className="process__grid">
          {/* Left: Heading */}
          <div className="process__header">
            <Reveal>
              <span className="studio-eyebrow studio-eyebrow--section">Our process</span>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="section-heading" id="process-heading">
                From first thought to final form.
              </h2>
            </Reveal>
            <p className="process__intro">A clear path from the first conversation to the final detail. Each phase brings strategy, design, and craft closer together.</p>
            <div className="process__coordinates" aria-hidden="true"><span>01—04 / STUDIO METHOD</span><ArrowIcon direction="down" size={18} /></div>
          </div>

          {/* Right: Timeline */}
          <div className="process__timeline">
            {steps.map((step, index) => (
              <motion.div key={step.number} className="process__step" whileHover={reducedMotion ? undefined : { y: -4 }} transition={{ duration: .25 }}>
                <Reveal delay={0.08 * index} className="process__step-inner">
                  <div className="process__step-topline"><span>{step.number} / 04</span><step.icon size={30} stroke={1.3} aria-hidden="true" /></div>
                  <div className="process__step-content">
                    <span className="process__step-phase">{step.phase}</span>
                    <h3 className="process__step-title">{step.title}</h3>
                    <p className="process__step-description">{step.description}</p>
                  </div>
                  <div className="process__step-footer" aria-hidden="true"><span>ZEROCRAFT / PROCESS</span><ArrowIcon direction="up-right" size={13} /></div>
                </Reveal>
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
