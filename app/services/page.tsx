"use client";

import { motion, useScroll, useTransform, type Easing } from "framer-motion";
import {
  Palette,
  Code,
  Rocket,
  BarChart3,
  Headphones,
  Zap,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import { useRef } from "react";

const easeOut: Easing = [0.16, 1, 0.3, 1];

interface Service {
  id: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  badge: string;
}

const ServicesPage = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const services: Service[] = [
    {
      id: 1,
      icon: <Palette size={32} />,
      title: "UI/UX Design",
      description:
        "Crafting beautiful, intuitive interfaces that users love. Every pixel is purposeful.",
      features: ["User Research", "Wireframing", "Prototyping", "Design Systems"],
      badge: "Design",
    },
    {
      id: 2,
      icon: <Code size={32} />,
      title: "Web Development",
      description:
        "Scalable, performant solutions built with cutting-edge technologies and best practices.",
      features: ["Frontend", "Backend", "Full-Stack", "API Development"],
      badge: "Development",
    },
    {
      id: 3,
      icon: <Rocket size={32} />,
      title: "Product Strategy",
      description:
        "Strategic roadmaps that align your product vision with market opportunities.",
      features: ["Market Analysis", "Competitive Research", "Roadmapping", "Growth"],
      badge: "Strategy",
    },
    {
      id: 4,
      icon: <BarChart3 size={32} />,
      title: "Analytics & Optimization",
      description:
        "Data-driven insights to maximize your digital presence and conversions.",
      features: ["Analytics Setup", "A/B Testing", "Performance Optimization", "Reports"],
      badge: "Analytics",
    },
    {
      id: 5,
      icon: <Headphones size={32} />,
      title: "Support & Maintenance",
      description:
        "Ongoing support to keep your digital presence running smoothly and securely.",
      features: ["24/7 Support", "Bug Fixes", "Updates", "Security"],
      badge: "Support",
    },
    {
      id: 6,
      icon: <Zap size={32} />,
      title: "Digital Transformation",
      description:
        "Modernize your business with comprehensive digital solutions and innovation.",
      features: ["Process Automation", "Legacy Migration", "Integration", "Innovation"],
      badge: "Transformation",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: easeOut },
    },
  };

  return (
    <div className="services-page" ref={containerRef}>
      {/* Animated gradient background */}
      <div className="services-bg">
        <motion.div
          className="services-bg-element services-bg-1"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="services-bg-element services-bg-2"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="services-bg-element services-bg-3"
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* Header */}
      <header className="services-header">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="services-header-content"
        >
          <div className="services-badge">
            <span className="services-badge-text">Our Services</span>
          </div>
          <h1 className="services-title">
            Everything you need to <span className="text-accent">succeed</span>
          </h1>
          <p className="services-subtitle">
            Comprehensive digital solutions tailored to your business goals
          </p>
        </motion.div>
      </header>

      {/* Services grid */}
      <main className="services-main">
        <div className="services-container">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-90px" }}
            className="services-grid"
          >
            {services.map((service, index) => {
              const scale = useTransform(
                scrollYProgress,
                [1, 0.90],
                [0.80, 1]
              );

              return (
                <motion.div
                  key={service.id}
                  variants={itemVariants}
                  className="services-card-wrapper"
                  whileHover={{ y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="services-card">
                    {/* Liquid glass background */}
                    <div className="services-card-glass" />
                    <div className="services-card-border" />

                    {/* Content */}
                    <motion.div
                      className="services-card-content"
                      style={{ scale }}
                    >
                      {/* Badge */}
                      <motion.div
                        className="services-card-badge"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ delay: index * 0.1 + 0.3 }}
                        viewport={{ once: true }}
                      >
                        {service.badge}
                      </motion.div>

                      {/* Icon */}
                      <motion.div
                        className="services-card-icon"
                        whileHover={{ rotate: 12, scale: 1.1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {service.icon}
                      </motion.div>

                      {/* Title */}
                      <h3 className="services-card-title">{service.title}</h3>

                      {/* Description */}
                      <p className="services-card-description">
                        {service.description}
                      </p>

                      {/* Features */}
                      <div className="services-card-features">
                        {service.features.map((feature, i) => (
                          <motion.div
                            key={i}
                            className="services-feature-item"
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{
                              delay: index * 0.1 + 0.4 + i * 0.05,
                            }}
                            viewport={{ once: true }}
                          >
                            <ChevronRight size={16} />
                            <span>{feature}</span>
                          </motion.div>
                        ))}
                      </div>

                      {/* CTA */}
                      <motion.button
                        className="services-card-cta"
                        whileHover={{ x: 6 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Learn More
                        <ArrowUpRight size={18} />
                      </motion.button>
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </main>

      {/* CTA Section */}
      <section className="services-cta-section">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="services-cta-content"
        >
          <h2 className="services-cta-title">Ready to get started?</h2>
          <p className="services-cta-description">
            Let's discuss which services are perfect for your project
          </p>
          <motion.button
            className="services-cta-button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Schedule a Consultation
          </motion.button>
        </motion.div>
      </section>
    </div>
  );
};

export default ServicesPage;
