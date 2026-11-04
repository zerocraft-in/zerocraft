"use client";
import { motion } from "framer-motion";
import type { HTMLAttributes } from "react";

export default function Reveal({ children, delay = 0, className = "" }: HTMLAttributes<HTMLDivElement> & { delay?: number }) {
  return <motion.div className={className} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.6, delay }}>{children}</motion.div>;
}
