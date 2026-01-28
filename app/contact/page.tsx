"use client";

import { motion } from "framer-motion";
import ContactForm from "@/components/ui/contact-form";
import ContactInfo from "@/components/ui/contact-info";
import type { Easing } from "framer-motion";

const easeOut: Easing = [0.16, 1, 0.3, 1];
export default function ContactPage() {
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
    <>
    <main className="contact-main">
      {/* Hero Section */}
      <section className="contact-hero">
        <motion.div
          animate={{
            opacity: [0.2, 0.35, 0.2],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="contact-hero-glow"
        />

        <div className="contact-hero-container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="contact-badge"
            >
              <span>Get in Touch</span>
            </motion.div>

            <h1 className="contact-title">
              Let's Talk About
              <motion.span
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="contact-title-accent"
              >
                Your Next Project
              </motion.span>
            </h1>

            <p className="contact-description">
              We're excited to hear about your vision. Whether you have a
              specific project in mind or just want to explore possibilities,
              let's connect and create something extraordinary together.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section">
        <div className="contact-container">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="contact-grid"
          >
            <motion.div variants={itemVariants} className="contact-form-col">
              <ContactForm />
            </motion.div>

            <motion.div variants={itemVariants}>
              <ContactInfo />
            </motion.div>
          </motion.div>
        </div>
      </section>
      </main>
    </>
  );
}
