"use client";

import { motion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <section
      id="home"
      className="min-h-screen flex items-center justify-center pt-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
    >
      {/* Background Elements */}
      <div className="absolute top-20 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl"></div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto text-center z-10"
      >
        {/* Tag */}
        <motion.div variants={itemVariants} className="mb-6">
          <span className="inline-block px-4 py-2 rounded-full bg-accent/20 text-accent text-sm font-semibold border border-accent/40">
            Welcome to zerocraft.studio
          </span>
        </motion.div>

        {/* Main Heading */}
        <motion.h1
          variants={itemVariants}
          className="text-5xl sm:text-6xl lg:text-7xl font-bold text-transparent mb-6 leading-tight"
        >
          <span className="block bg-linear-to-r from-primary  via-muted/80 to-primary bg-clip-text">
            Craft Your
          </span>
          <span className="block bg-linear-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Digital Future
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          variants={itemVariants}
          className="text-lg text-muted/70 max-w-2xl mx-auto mb-8"
        >
          Premium digital solutions that transform your brand. From stunning
          design to powerful web experiences, we create excellence.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
        >
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 border text-primary-foreground px-8"
          >
            Start Your Project
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
          <Button size="lg" className="bg-accent border-none" variant="outline">
            View Our Work
          </Button>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          variants={itemVariants}
          className="flex justify-center mt-12"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            className="text-accent/60 text-sm"
          >
            <div className="flex flex-col items-center">
              <span>Scroll to explore</span>
              <span>
                <ChevronDown className="w-4 h-4" />
              </span>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Floating Cards */}
      <div className="absolute bottom-10 left-20 hidden lg:block">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="bg-foreground bg-linear-to-r from-foreground shadow-sm  to-primary rounded-lg p-4 w-48 backdrop-blur-sm"
        >
          <p className="text-accent text-sm">
            <span className="text-muted/80 font-semibold">30+</span> Projects
          </p>
        </motion.div>
      </div>

      <div className="absolute top-1/3 right-20 hidden lg:block">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="bg-foreground bg-linear-to-r from-primary via-foreground shadow-sm  to-foreground  rounded-lg p-4 w-48 backdrop-blur-sm"
        >
          <p className="text-muted/80 text-sm">
            <span className="text-accent font-semibold">5 Years</span>{" "}
            Excellence
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
