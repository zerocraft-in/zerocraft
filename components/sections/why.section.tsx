"use client";

import { motion } from "framer-motion";
import type React from "react";
import type { Easing } from "framer-motion";

const easeOut: Easing = [0.16, 1, 0.3, 1];

const WhyZerocraft: React.FC = () => {
  const values = [
    {
      title: "Strategy-First Approach",
      description:
        "Every pixel, every line of code serves a strategic purpose. We begin with deep insights, not assumptions.",
      icon: "→",
    },
    {
      title: "Design + Tech Under One Roof",
      description:
        "Seamless collaboration between design and development ensures your vision is executed flawlessly.",
      icon: "◆",
    },
    {
      title: "Clean, Modern Aesthetics",
      description:
        "We believe in timeless design that remains relevant. Minimalist, refined, purposeful.",
      icon: "—",
    },
    {
      title: "Scalable Solutions",
      description:
        "Built for growth. Your digital presence evolves with your ambitions without technical debt.",
      icon: "↗",
    },
    {
      title: "Long-Term Partnership",
      description:
        "We are invested in your success beyond launch. Strategy, support, and continuous optimization.",
      icon: "∞",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: easeOut },
    },
  };

  return (
    <section className="why-section">
      <div className="why-container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="why-header"
        >
          <h2 className="why-title">Why Zerocraft.studio?</h2>
          <p className="why-subtitle">
            We don't just build websites or apps. We create strategic digital
            experiences that drive real business value.
          </p>
        </motion.div>

        {/* Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="why-grid"
        >
          {values.map((value, index) => (
            <motion.div key={index} variants={itemVariants} className="why-card">
              <div className="why-card-inner">
                <div className="why-card-bg" />

                <div className="why-card-content">
                  <span className="why-icon">{value.icon}</span>

                  <h3 className="why-card-title">{value.title}</h3>

                  <p className="why-card-desc">{value.description}</p>

                  <div className="why-accent-line" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default WhyZerocraft;
