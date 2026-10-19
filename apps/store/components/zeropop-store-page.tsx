"use client";

import { motion, useReducedMotion } from "framer-motion";
import ZeroPopFooter from "@/components/store/ZeroPopFooter";
import ZeroPopHeader from "@/components/store/ZeroPopHeader";

export default function ZeroPopStorePage({
  eyebrow,
  title,
  accent,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  description?: string;
  children?: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="zeropop-store-pages">
      <ZeroPopHeader />
      <main className="zeropop-page-main">
        <motion.div className="zeropop-page-intro" initial={reduceMotion ? undefined : { opacity: 0, y: 24 }} animate={reduceMotion ? undefined : { opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
          <p>{eyebrow}</p>
          <h1>
            {title} {accent && <em>{accent}</em>}
          </h1>
          {description && (
            <div className="zeropop-page-description">{description}</div>
          )}
        </motion.div>
        <motion.div initial={reduceMotion ? undefined : { opacity: 0, y: 18 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08 }} transition={{ duration: 0.6, delay: 0.08 }}>{children}</motion.div>
      </main>
      <ZeroPopFooter />
    </div>
  );
}
