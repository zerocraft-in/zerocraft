"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Reveal from "@/components/ui/Reveal";
import Container from "@/components/ui/Container";

const stats = [
  { number: "150+", label: "Projects Delivered" },
  { number: "8+", label: "Years Experience" },
  { number: "50+", label: "Happy Clients" },
  { number: "12", label: "Team Members" },
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
            <h2 className="about__heading">
              We are a creative development agency that transforms ideas into
              <span className="about__heading--muted"> exceptional digital experiences.</span>
            </h2>
          </Reveal>

          {/* Right: Description */}
          <div className="about__content">
            <Reveal delay={0.2}>
              <p className="about__description">
                At Zerocraft Studio, we blend strategy, design, and technology to build
                brands that stand out. Our multidisciplinary team brings together
                creative thinking with technical precision to deliver solutions that
                drive real results.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <p className="about__description">
                From brand identity systems to complex web applications, we approach
                every project with the same dedication to craft and quality. We believe
                in the power of thoughtful design to create meaningful connections
                between brands and their audiences.
              </p>
            </Reveal>
            <Reveal delay={0.4}>
              <a href="/about" className="btn btn--outline">
                Learn More About Us
                <span className="btn__arrow" aria-hidden="true">→</span>
              </a>
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
