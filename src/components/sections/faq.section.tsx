"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import MaxWidthWrapper from "@/components/wrapper/max-width.wrapper";

const faqs = [
  {
    question: "What materials are used for the merchandise?",
    answer:
      "We use high-quality cotton and polyester blends to ensure durability and comfort.",
  },
  {
    question: "Can I customize my order?",
    answer:
      "Yes! You can personalize your design, text, and colors before placing the order.",
  },
  {
    question: "What is the delivery time?",
    answer:
      "Orders are typically delivered within 7-10 business days, depending on your location.",
  },
  {
    question: "Do you offer returns or exchanges?",
    answer:
      "We accept returns within 30 days if the item is unused and in original condition. Customized items are non-refundable.",
  },
];

export const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <motion.section
      id="faq"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      className="py-10"
      transition={{ duration: 0.8, ease: "easeOut" }}
      viewport={{ once: true, amount: 0.3 }}
    >
      <MaxWidthWrapper>
        <h2 className="text-2xl font-bold text-center mb-6">FAQ&apos;s</h2>
        <div className="space-y-4 max-w-lg mx-auto">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border bg-background rounded-2xl p-4 cursor-pointer"
            >
              <div
                className="flex justify-between items-center"
                onClick={() => toggleFAQ(index)}
              >
                <h3 className="text-sm font-medium">{faq.question}</h3>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown className="w-5 h-5" />
                </motion.div>
              </div>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{
                  height: openIndex === index ? "auto" : 0,
                  opacity: openIndex === index ? 1 : 0,
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <p className="mt-2 text-xs text-gray-600">{faq.answer}</p>
              </motion.div>
            </div>
          ))}
        </div>
      </MaxWidthWrapper>
    </motion.section>
  );
};
