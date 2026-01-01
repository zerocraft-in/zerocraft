"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import MaxWidthWrapper from "@/components/wrapper/max-width.wrapper";

export default function AboutPage() {
  return (
    <main className="py-20">
      <MaxWidthWrapper className="space-y-24 px-4 md:px-20">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-primary mb-4">
            We're More Than a Digital Agency
          </h1>
          <p className="text-primary/70 max-w-2xl mx-auto">
            At Pothigai Pixels, we blend creativity and technology to build
            unforgettable brand experiences.
          </p>
        </motion.section>

        {/* Mission & Vision */}
        <motion.section
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-2 gap-10 items-center"
        >
          <div>
            <h2 className="text-2xl font-bold text-primary mb-4">
              Our Mission
            </h2>
            <p className="text-primary/70 leading-relaxed">
              To empower businesses with impactful design, strategic marketing,
              and digital tools that elevate their presence and drive growth.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary mb-4">Our Vision</h2>
            <p className="text-primary/70 leading-relaxed">
              To become a leading creative agency known for innovation,
              integrity, and outstanding results across all digital platforms.
            </p>
          </div>
        </motion.section>

        {/* Core Values */}
        <motion.section
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl font-bold text-primary text-center mb-10">
            What Sets Us Apart
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              "Creativity",
              "Strategy",
              "Commitment",
              "Transparency",
              "Collaboration",
              "Results",
            ].map((value, idx) => (
              <div
                key={idx}
                className="border border-primary/10 rounded-xl p-6 bg-background hover:shadow-md transition"
              >
                <h3 className="text-primary font-semibold">{value}</h3>
                <p className="text-primary/60 text-sm mt-2">
                  {value === "Creativity" &&
                    "Bold, fresh ideas that captivate and engage."}
                  {value === "Strategy" &&
                    "Every solution is backed by data and intent."}
                  {value === "Commitment" &&
                    "We deliver — on time and on promise."}
                  {value === "Transparency" &&
                    "Clear communication and open processes."}
                  {value === "Collaboration" &&
                    "Working closely with you every step."}
                  {value === "Results" &&
                    "Focused on driving measurable success."}
                </p>
              </div>
            ))}
          </div>
        </motion.section>
      </MaxWidthWrapper>
      {/* Call to Action */}
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        viewport={{ once: true }}
        className="text-center bg-primary text-background py-16"
      >
        <h3 className="text-2xl font-bold mb-4">Ready to work with us?</h3>
        <p className="mb-6">
          Let&apos;s create something amazing together. We&apos;re just an email
          or call away.
        </p>
        <Link
          href="/contact"
          className="bg-background text-primary font-semibold px-6 py-3 rounded-full hover:bg-white transition"
        >
          Contact Us
        </Link>
      </motion.section>
    </main>
  );
}
