"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Reveal from "@/components/ui/Reveal";
import Container from "@/components/ui/Container";
import BadgeButton from "@/components/ui/BadgeButton";

const stats = [
  { number: "Design", label: "Identity & digital experiences" },
  { number: "Code", label: "Websites & applications" },
  { number: "Story", label: "Photography, video & motion" },
  { number: "Tenkasi", label: "Our home. Your next chapter." },
];

export default function About() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section className="section about" id="about" aria-label="About us">
      <Container>
        {/* Label */}
        <Reveal delay={0}>
          <span className="about__label text-label">About Us</span>
        </Reveal>

        {/* Main editorial layout */}
        <div className="about__grid" ref={ref}>
          {/* Left: Large statement */}
          <Reveal delay={0.1} className="about__statement">
            <h2 className="section-heading">
              We are a creative development agency that transforms ideas into
              <span className="about__heading--muted">
                {" "}
                exceptional digital experiences.
              </span>
            </h2>
          </Reveal>

          {/* Right: Description */}
          <div className="about__content">
            <Reveal delay={0.2}>
              <p className="section-desc">
                At Zerocraft Studio, we blend strategy, design, and technology
                to build brands that stand out. Our multidisciplinary team
                brings together creative thinking with technical precision to
                deliver solutions that drive real results.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <p className="section-desc">
                We believe in crafting authentic, innovative, and scalable digital
                products that connect, inspire, and evolve with your brand. From
                Tenkasi to clients across the globe, every touchpoint is engineered
                with meticulous craft and technical precision.
              </p>
            </Reveal>
            <Reveal delay={0.4}>
              <div className="about__btn-wrapper">
                <BadgeButton href="/about" text="MEET THE STUDIO" />
              </div>
            </Reveal>
          </div>
        </div>

        {/* Stats */}
        <div className="about__stats">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="about__stat"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.8,
                delay: 0.5 + i * 0.1,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
              }}
            >
              <span className="about__stat-number">{stat.number}</span>
              <span className="about__stat-label">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
