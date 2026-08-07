"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { IconMail, IconCheck, IconArrowRight } from "@tabler/icons-react";

export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-neutral-900 text-white">
      {/* Background Soft Glow Accents */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="container-site relative z-10 max-w-4xl mx-auto text-center">
        <span className="text-label text-amber-400 mb-3 block">
          Exclusive Membership
        </span>
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white mb-4">
          Subscribe and Receive Exclusive Offers
        </h2>
        <p className="text-neutral-400 text-sm md:text-base max-w-xl mx-auto mb-8 font-light">
          Join the ZeroCraft Collector Circle for early access to limited poster drops, artisan frame releases, and a 15% discount on your first order.
        </p>

        {subscribed ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-sm"
          >
            <IconCheck size={20} className="text-emerald-400" />
            Thank you for subscribing! Check your inbox for your 15% discount code.
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto">
            <div className="relative w-full">
              <IconMail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address..."
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-neutral-400 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-amber-400 text-black font-semibold text-xs uppercase tracking-wider hover:bg-amber-300 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              Subscribe <IconArrowRight size={16} />
            </button>
          </form>
        )}

        <p className="text-[11px] text-neutral-500 font-mono mt-4">
          No spam, ever. Unsubscribe at any time with one click.
        </p>
      </div>
    </section>
  );
}
