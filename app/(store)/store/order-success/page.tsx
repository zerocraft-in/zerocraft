"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { IconCheck, IconPackage, IconArrowRight } from "@tabler/icons-react";
import { useStore } from "@/lib/store/useStore";

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const { orders } = useStore();
  const matchedOrder = orders.find((o) => o.orderNumber === orderId);

  return (
    <div className="py-16 md:py-24 min-h-screen flex items-center justify-center">
      <div className="container-site max-w-2xl text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-2xl space-y-6"
        >
          {/* Animated Success Check */}
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto">
            <IconCheck size={40} />
          </div>

          <div>
            <span className="text-label text-lime-600 dark:text-lime-400 mb-2 block">
              Order request saved
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white mb-2">
              Thanks for your request.
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 font-light max-w-md mx-auto">
              {matchedOrder ? <>Your request <strong className="font-mono text-neutral-900 dark:text-white">{orderId}</strong> is recorded. The studio will confirm availability and fulfillment. No payment has been collected.</> : "We could not find this order in this browser. If you just submitted a request, contact the studio with your order number."}
            </p>
          </div>

          {/* Order Brief Info */}
          {matchedOrder && (
            <div className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800/60 text-left font-mono text-xs space-y-3">
              <div className="flex justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <span className="text-neutral-400">Order Number</span>
                <span className="font-bold text-neutral-900 dark:text-white">{matchedOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <span className="text-neutral-400">Date</span>
                <span className="text-neutral-900 dark:text-white">{matchedOrder.date}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <span className="text-neutral-400">Status</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Pending studio confirmation</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-neutral-900 dark:text-white pt-1">
                <span>Estimated total · due on delivery</span>
                <span className="text-lime-600 dark:text-lime-400">${matchedOrder.total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/store/account/orders"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-mono font-semibold uppercase tracking-wider hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
            >
              <IconPackage size={16} /> View Order Status
            </Link>

            <Link
              href="/store/shop"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-lime-500 text-black font-semibold text-xs uppercase tracking-wider hover:bg-lime-400 transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              Continue Shopping <IconArrowRight size={16} />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
