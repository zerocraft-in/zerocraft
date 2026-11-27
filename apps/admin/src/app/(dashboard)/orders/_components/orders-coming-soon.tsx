
"use client";

import { motion } from "framer-motion";
import { Package } from "lucide-react";

export function OrdersComingSoon() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center justify-center gap-6 py-20"
    >
      <div
        className="flex size-20 items-center justify-center rounded-2xl bg-[#f1f5f9]"
        aria-hidden="true"
      >
        <Package className="size-6 text-foreground" />
      </div>

      <h2 className="text-lg font-semibold text-foreground">
        Orders coming soon
      </h2>

      <p className="mt-2 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
        Order management is on its way. You&rsquo;ll be able to view, filter,
        and export orders here once it&rsquo;s available.
      </p>
    </motion.div>
  );
}
