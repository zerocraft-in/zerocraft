"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

export const OurServices = () => {
  const services = [
    {
      number: "01",
      title: "BRANDING",
      description:
        "Create a memorable identity that resonates with your audience and sets you apart from competitors.",
      icon: (
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M25 25H55M25 25V55M25 25L40 40M55 25V55M55 25L40 40M25 55H55M25 55L40 40M55 55L40 40"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle
            cx="40"
            cy="40"
            r="10"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      ),
    },
    {
      number: "02",
      title: "WEB DEVELOPMENT",
      description:
        "Custom websites and applications built with cutting-edge technology for optimal performance.",
      icon: (
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
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
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M40 20V25M25 40H20M30 30L25 25M50 30L55 25M60 40H55M40 55V60M40 25C37.2386 25 35 27.2386 35 30C35 32.7614 37.2386 35 40 35M40 25C42.7614 25 45 27.2386 45 30C45 32.7614 42.7614 35 40 35M40 35V40M40 40C37.2386 40 35 42.2386 35 45C35 47.7614 37.2386 50 40 50M40 40C42.7614 40 45 42.2386 45 45C45 47.7614 42.7614 50 40 50"
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
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M25 25H45C45 25 45 35 45 40C45 45 45 55 45 55H25C25 55 25 45 25 40C25 35 25 25 25 25Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M45 40L55 30V50L45 40Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle
            cx="35"
            cy="35"
            r="3"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      ),
    },
    {
      number: "05",
      title: "UI/UX DESIGN",
      description:
        "User-centered design that enhances usability and creates delightful digital experiences.",
      icon: (
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20 30C20 24.4772 24.4772 20 30 20H50C55.5228 20 60 24.4772 60 30V50C60 55.5228 55.5228 60 50 60H30C24.4772 60 20 55.5228 20 50V30Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M30 35H50M30 45H40"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="35" cy="30" r="2" fill="currentColor" />
          <circle cx="45" cy="50" r="2" fill="currentColor" />
        </svg>
      ),
    },
    {
      number: "06",
      title: "PRINTING",
      description:
        "High-quality printing services for marketing materials, business stationery, and promotional products.",
      icon: (
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
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
          <path
            d="M30 50H50M30 55H45"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="55" cy="35" r="2" fill="currentColor" />
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
        className="z-10 max-w-screen-md mx-auto px-4"
      >
        <header className="text-center mb-16">
          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium bg-primary text-background mb-4">
            <div className="h-2 w-2 rounded-full bg-background mr-2" />
            Our Services
          </div>
          <h2 className="text-3xl font-bold mt-4 text-primary">
            What We Offer
          </h2>
          <p className="text-primary/60 max-w-xl mx-auto mt-2">
            Explore the wide range of services we provide to elevate your brand
            and business.
          </p>
        </header>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {services.map((service, idx) => (
            <motion.div
              key={idx}
              className="relative bg-background backdrop-blur-md p-6 group rounded-xl flex flex-col items-center text-center border border-white/20 transition-all duration-300 hover:bg-primary hover:shadow-lg hover:border-white/30 w-full min-h-[300px]"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 17,
                delay: idx * 0.1,
              }}
              viewport={{ once: true, amount: 0.3 }}
            >
              <div className="absolute top-4 right-4 text-xs font-bold text-primary/70 group-hover:text-secondary/70">
                {service.number}
              </div>

              <div className="text-primary group-hover:text-secondary transition-colors duration-300">
                {service.icon}
              </div>

              <h3 className="text-base font-bold text-primary group-hover:text-secondary transition-colors duration-300 mt-4">
                {service.title}
              </h3>

              <p className="text-primary/70 text-xs group-hover:text-secondary/80 leading-relaxed mt-2">
                {service.description}
              </p>

              <div className="absolute bottom-4 h-1 bg-primary rounded-full w-0 group-hover:w-1/2 group-hover:bg-secondary transition-all duration-300" />
            </motion.div>
          ))}
        </div>

        <div className="mt-16 flex flex-col md:flex-row items-center justify-between">
          <h3 className="text-base font-bold text-primary mb-6 md:mb-0">
            Digital Agency Services Built Specifically For Your Business.
          </h3>
          <Link
            href="#"
            className="bg-primary hover:bg-primary/90 rounded-full !text-background font-medium px-6 py-3 text-sm transition-colors"
          >
            Find Your Solution
          </Link>
        </div>
      </motion.div>
    </section>
  );
};
