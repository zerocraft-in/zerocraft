"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { motion } from "framer-motion";

/**
 * Route transition boundary for the CMS. The key makes each navigation a
 * fresh route instance while preserving the global shell in app/layout.tsx.
 */
export default function CmsTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      data-cms-template="true"
      className="contents"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      style={{ willChange: "opacity" }}
    >
      {children}
    </motion.div>
  );
}
