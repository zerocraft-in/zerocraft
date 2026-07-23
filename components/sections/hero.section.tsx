"use client";

import { motion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import type { Easing } from "framer-motion";

const easeOut: Easing = [0.16, 1, 0.3, 1];

const Hero = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: easeOut },
    },
  };

  return (
    <section id="hero-section" className="hero">
      {/* Background blobs */}
      <motion.div
        className="hero-bg hero-bg--right"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
      />
      <motion.div
        className="hero-bg hero-bg--left"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="hero-container"
      >
        {/* Tag */}
        <motion.div variants={itemVariants} className="hero-tag">
          <span>Welcome to zerocraft.studio</span>
        </motion.div>

        {/* Heading */}
        <motion.h1 variants={itemVariants} className="hero-title">
          <span className="hero-title-line hero-gradient-muted">
            Craft Your
          </span>
          <span className="hero-title-line hero-gradient-accent">
            Digital Future
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.p variants={itemVariants} className="hero-subtitle">
          Premium digital solutions that transform your brand. From stunning
          design to powerful web experiences, we create excellence.
        </motion.p>

        {/* CTA */}
        <motion.div variants={itemVariants} className="hero-cta">
          <button className="hero-btn-secondary" onClick={() => window.location.href = '/create-project'}>
            Start Your Project
            <ArrowRight className="hero-btn-icon" />
          </button>

          <button className="hero-btn-primary" onClick={() => window.location.href = '/works'}>
            View Our Work
          </button>
        </motion.div>

        {/* Scroll */}
        <motion.div variants={itemVariants} className="hero-scroll">
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="hero-scroll-inner"
          >
            <span>Scroll to explore</span>
            <ChevronDown size={16} />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Floating cards */}
      <div className="hero-card hero-card--left">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="hero-card-box hero-card-projects"
        >
          <p>
            <strong>30+</strong> Projects
          </p>
        </motion.div>
      </div>

      <div className="hero-card hero-card--right">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="hero-card-box hero-card-years"
        >
          <p>
            <strong>2 Years</strong> Serve
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
