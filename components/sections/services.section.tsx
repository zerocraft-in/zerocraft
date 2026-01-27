"use client";

import { motion } from "framer-motion";
import Link from "next/link";

/* ===============================
   Premium Motion Variants
================================ */
const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 40,
    scale: 0.96,
    filter: "blur(6px)",
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1], // premium easing
    },
  },
};

export const OurServices = () => {
  const services = [
    {
      number: "01",
      title: "BRANDING",
      description:
        "Create a memorable identity that resonates with your audience and sets you apart from competitors.",
      icon: (
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <path
            d="M25 25H55M25 25V55M25 25L40 40M55 25V55M55 25L40 40M25 55H55M25 55L40 40M55 55L40 40"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle cx="40" cy="40" r="10" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      number: "02",
      title: "WEB DEVELOPMENT",
      description:
        "Custom websites and applications built with cutting-edge technology for optimal performance.",
      icon: (
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <path
            d="M20 25H60M20 25V55M20 25V20H60V55H20M20 55H60M30 35L25 40L30 45M50 35L55 40L50 45M37 45L43 35"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      ),
    },
    {
      number: "03",
      title: "DIGITAL MARKETING",
      description:
        "Strategic campaigns that drive traffic, generate leads, and increase your online visibility.",
      icon: (
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <path
            d="M40 20V25M25 40H20M30 30L25 25M50 30L55 25M60 40H55M40 55V60"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      ),
    },
    {
      number: "04",
      title: "VIDEO PRODUCTION",
      description:
        "Compelling visual storytelling that captures attention and communicates your message effectively.",
      icon: (
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <path
            d="M25 25H45V55H25V25Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M45 40L55 30V50L45 40Z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      number: "05",
      title: "UI / UX DESIGN",
      description:
        "User-centered design that enhances usability and creates delightful digital experiences.",
      icon: (
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <rect
            x="20"
            y="20"
            width="40"
            height="40"
            rx="6"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M30 35H50M30 45H40"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      number: "06",
      title: "PRINTING",
      description:
        "High-quality printing services for marketing materials and promotional products.",
      icon: (
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <rect
            x="25"
            y="20"
            width="30"
            height="10"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <rect
            x="20"
            y="30"
            width="40"
            height="15"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M25 45V60H55V45" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
    },
  ];

  return (
    <section className="relative py-20" id="services">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true, amount: 0.3 }}
        className="z-10 max-w-6xl mx-auto px-4"
      >
        {/* Header */}
        <header className="text-center mb-16">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent-primary text-primary mb-4">
            <span className="h-2 w-2 rounded-full bg-primary mr-2" />
            Our Services
          </div>
          <h2 className="text-3xl font-bold text-accent-primary">
            What We Offer
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mt-2">
            Explore the wide range of services we provide to elevate your brand.
          </p>
        </header>

        {/* Services Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
        >
          {services.map((service, idx) => (
            <motion.div
              key={idx}
              variants={cardVariants}
              whileHover={{
                y: -8,
                scale: 1.02,
                transition: { duration: 0.35 },
              }}
              className="relative bg-background/5 backdrop-blur-md p-6 rounded-xl border border-white/20
                         hover:bg-primary hover:shadow-[0_20px_40px_rgba(0,0,0,0.25)]
                         transition-all duration-300 min-h-[300px] group"
            >
              <span className="absolute top-4 right-4 text-xs font-bold opacity-70">
                {service.number}
              </span>

              <motion.div
                className="text-accent-primary group-hover:text-secondary"
                whileHover={{ rotate: 3, scale: 1.08 }}
                transition={{ type: "spring", stiffness: 200, damping: 12 }}
              >
                {service.icon}
              </motion.div>

              <h3 className="mt-4 font-bold text-secondary">
                {service.title}
              </h3>

              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {service.description}
              </p>

              <motion.div
                initial={{ width: 0 }}
                whileHover={{ width: "50%" }}
                transition={{ duration: 0.4 }}
                className="absolute bottom-4 h-[2px] bg-secondary rounded-full"
              />
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <div className="mt-16 flex flex-col md:flex-row items-center justify-between">
          <h3 className="font-bold mb-6 md:mb-0">
            Digital Agency Services Built For Your Business.
          </h3>
          <Link
            href="#"
            className="bg-primary text-background px-6 py-3 rounded-full text-sm font-medium hover:bg-primary/90"
          >
            Find Your Solution
          </Link>
        </div>
      </motion.div>
    </section>
  );
};
