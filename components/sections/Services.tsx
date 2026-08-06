"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Reveal from "@/components/ui/Reveal";
import Container from "@/components/ui/Container";

const services = [
  {
    number: "01",
    title: "Brand Identity",
    description:
      "We craft distinctive brand identities that capture your vision and resonate with your audience. From logos to comprehensive brand systems, every element is thoughtfully designed.",
    tags: ["Logo Design", "Brand Guidelines", "Visual Identity", "Brand Strategy"],
  },
  {
    number: "02",
    title: "Web Development",
    description:
      "We build performant, accessible, and beautifully crafted websites and web applications using modern technologies. Every pixel is intentional, every interaction is smooth.",
    tags: ["Next.js", "React", "TypeScript", "Full-Stack"],
  },
  {
    number: "03",
    title: "UI/UX Design",
    description:
      "We design intuitive user experiences and stunning interfaces that delight users and drive engagement. Research-driven design that puts users at the center.",
    tags: ["User Research", "Wireframing", "Prototyping", "Design Systems"],
  },
  {
    number: "04",
    title: "Digital Marketing",
    description:
      "We develop data-driven marketing strategies that amplify your brand presence and drive measurable growth across all digital channels.",
    tags: ["SEO", "Social Media", "Content Strategy", "Analytics"],
  },
  {
    number: "05",
    title: "Video Production",
    description:
      "We produce compelling video content that tells your story with cinematic quality. From concept to final edit, we handle every aspect of production.",
    tags: ["Motion Graphics", "Brand Films", "Social Content", "Animation"],
  },
  {
    number: "06",
    title: "Print & Packaging",
    description:
      "We design premium print materials and packaging that make a lasting physical impression. Tangible brand touchpoints crafted with care.",
    tags: ["Packaging", "Editorial", "Stationery", "Signage"],
  },
];

export default function Services() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <section className="section services" id="services" aria-label="Our services">
      <Container>
        <Reveal>
          <span className="services__label text-label">What We Do</span>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="services__heading">Services</h2>
        </Reveal>

        <div className="services__list">
          {services.map((service, i) => (
            <Reveal key={service.number} delay={0.05 * i}>
              <div
                className={`services__item ${activeIndex === i ? "services__item--active" : ""}`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
                role="button"
                tabIndex={0}
                onFocus={() => setActiveIndex(i)}
                onBlur={() => setActiveIndex(null)}
              >
                <div className="services__item-header">
                  <span className="services__item-number">{service.number}</span>
                  <h3 className="services__item-title">{service.title}</h3>
                  <span className="services__item-toggle" aria-hidden="true">
                    {activeIndex === i ? "−" : "+"}
                  </span>
                </div>

                <AnimatePresence>
                  {activeIndex === i && (
                    <motion.div
                      className="services__item-content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        duration: 0.5,
                        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
                      }}
                    >
                      <p className="services__item-description">{service.description}</p>
                      <div className="services__item-tags">
                        {service.tags.map((tag) => (
                          <span key={tag} className="services__item-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
