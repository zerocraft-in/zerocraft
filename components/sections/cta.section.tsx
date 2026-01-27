"use client";
import { useState } from "react";
import MaxWidthWrapper from "@/components/wrapper/max-width.wrapper";
import { InteractiveHoverButton } from "../buttons/interactive.btn";

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

export const CTASection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <MaxWidthWrapper>
      <div className="space-y-4 py-10 max-w-lg flex items-center justify-center flex-col mx-auto">
        <h2 className="font-bold text-lg text-accent-primary">Looking to craft your brand with us?</h2>
        <p className="text-center text-sm text-muted-foreground">
          Experience creative solutions that enhance your brand and drive
          meaningful growth for your business!
        </p>
        <InteractiveHoverButton className="text-xs">
          Schedule a Call
        </InteractiveHoverButton>
      </div>
    </MaxWidthWrapper>
  );
};
