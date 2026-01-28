"use client";

import type React from "react";
import { motion, useScroll, useTransform, type Easing } from "framer-motion";
import {
  IconSearch,
  IconChecklist,
  IconSparkles,
  IconCode,
  IconRocket,
} from "@tabler/icons-react";
import { useRef } from "react";

const easeOut: Easing = [0.16, 1, 0.3, 1];

interface IconProps {
  icon: React.ReactNode;
  delay: number;
}

const IconBox: React.FC<IconProps> = ({ icon, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
    whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
    whileHover={{ scale: 1.1, rotate: 6 }}
    transition={{ duration: 0.6, delay, ease: easeOut }}
    viewport={{ once: true }}
    className="icon-box"
  >
    <motion.div
      className="icon-glow"
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 3, repeat: Infinity }}
    />
    <div className="icon-inner">{icon}</div>
    <div className="icon-border" />
  </motion.div>
);

const Approach: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const steps = [
    {
      number: "01",
      title: "Discovery",
      description:
        "We dive deep into understanding your business, audience, and competitive landscape.",
      icon: <IconSearch size={28} />,
    },
    {
      number: "02",
      title: "Strategy",
      description:
        "We define a clear roadmap aligned with your goals and long-term vision.",
      icon: <IconChecklist size={28} />,
    },
    {
      number: "03",
      title: "Design",
      description:
        "Beautiful, intuitive interfaces that balance aesthetics and usability.",
      icon: <IconSparkles size={28} />,
    },
    {
      number: "04",
      title: "Development",
      description:
        "Scalable, high-performance solutions built with clean modern code.",
      icon: <IconCode size={28} />,
    },
    {
      number: "05",
      title: "Launch",
      description:
        "Confident deployment with performance, SEO, and security best practices.",
      icon: <IconRocket size={28} />,
    },
    {
      number: "06",
      title: "Growth & Optimization",
      description:
        "Continuous improvement, analytics, and optimization for real growth.",
      icon: <IconSparkles size={28} />,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.3 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40, rotateX: 12 },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: { duration: 0.7, ease: easeOut },
    },
  };

  return (
    <section className="approach-section">
      <div className="approach-container" ref={containerRef}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easeOut }}
          viewport={{ once: true }}
          className="approach-header"
        >
          <span className="approach-badge">Our Proven Methodology</span>

          <h2 className="approach-title">
            Strategic Process
            <span className="accent-text">Exceptional Results</span>
          </h2>

          <p className="approach-subtitle">
            A methodical approach combining strategy, creativity, and technical
            excellence.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="approach-grid"
        >
          {steps.map((step, index) => {
            const scale = useTransform(
              scrollYProgress,
              [0, 1],
              [1, 0.92 + index * 0.01]
            );

            return (
              <motion.div
                key={index}
                variants={itemVariants}
                style={{
                  position: "sticky",
                  top: `calc(80px + ${index * 14}px)`,
                  zIndex: steps.length - index,
                }}
                className="step-card sticky-card"
              >
                <div className="step-bg" />

                <motion.div
                  className="step-content"
                  style={{ scale }}
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.3 }}
                >
                  <IconBox icon={step.icon} delay={index * 0.12} />

                  <span className="step-badge">{step.number}</span>

                  <h3 className="step-title">{step.title}</h3>
                  <p className="step-desc">{step.description}</p>

                  <motion.div
                    className="step-arrow"
                    animate={{ x: [0, 6, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  >
                    Next step →
                  </motion.div>

                  <div className="step-bottom-accent" />
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default Approach;
