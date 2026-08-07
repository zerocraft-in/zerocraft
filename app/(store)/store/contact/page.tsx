"use client";

import { useState } from "react";
import Breadcrumbs from "@/components/store/Breadcrumbs";
import { toast } from "sonner";
import {
  IconMail,
  IconPhone,
  IconMapPin,
  IconClock,
  IconChevronDown,
  IconSend,
} from "@tabler/icons-react";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "Custom Order Inquiry",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast.success("Message sent! Our support team will reply within 24 hours.");
  };

  const faqs = [
    {
      q: "How long does custom monogramming take?",
      a: "Custom laser-engraved pens, mugs, and gift boxes are processed within 24 to 48 business hours prior to dispatch.",
    },
    {
      q: "What is your return & exchange policy?",
      a: "We offer a 30-day risk-free return guarantee on all non-customized items. If your poster or frame arrives damaged, we ship a free replacement immediately.",
    },
    {
      q: "Do your frames include mounting hardware?",
      a: "Yes! All solid oak and aluminum gallery frames come pre-installed with heavy-duty dual-cleat wall hangers and wall anchor screws.",
    },
    {
      q: "Do you offer corporate or bulk gifting discounts?",
      a: "Absolutely. For orders exceeding 15 units of custom gift boxes or notebooks, please contact our team directly for tier pricing.",
    },
  ];

  return (
    <div className="py-8 min-h-screen">
      <div className="container-site">
        <Breadcrumbs items={[{ label: "Contact & Support" }]} />

        {/* Header */}
        <div className="my-8 max-w-2xl">
          <span className="text-label text-amber-600 dark:text-amber-400 mb-2 block">
            Get In Touch
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white mb-4">
            We&apos;re Here to Help
          </h1>
          <p className="text-sm text-neutral-500 font-light leading-relaxed">
            Have a question about custom dimensions, order status, or corporate gifting? Send us a note below.
          </p>
        </div>

        {/* Contact Form & Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 my-8 items-start">
          {/* Form (7 cols) */}
          <div className="lg:col-span-7 p-6 sm:p-10 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white font-mono uppercase tracking-wider mb-6">
              Send a Direct Message
            </h2>

            {submitted ? (
              <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono text-xs text-center space-y-2">
                <p className="font-bold text-sm">Message Delivered!</p>
                <p>Thank you {form.name}. A customer specialist has been assigned to your request.</p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold text-xs"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-neutral-400 uppercase">Your Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Julian Vance"
                      className="w-full p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-400 uppercase">Email Address</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="julian@example.com"
                      className="w-full p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase">Inquiry Topic</label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-amber-400"
                  >
                    <option>Custom Order Inquiry</option>
                    <option>Order Tracking & Shipping</option>
                    <option>Returns & Exchanges</option>
                    <option>Corporate Bulk Gifting</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase">Message</label>
                  <textarea
                    rows={5}
                    required
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Describe your inquiry details..."
                    className="w-full p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 px-6 rounded-2xl bg-amber-500 text-black font-semibold text-xs uppercase tracking-wider hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 shadow-md"
                >
                  <IconSend size={16} /> Submit Message
                </button>
              </form>
            )}
          </div>

          {/* Contact Details (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 text-white space-y-6 shadow-xl">
              <h3 className="text-base font-bold font-mono uppercase tracking-wider text-amber-400">
                Studio Contact Details
              </h3>

              <div className="space-y-4 text-xs font-mono text-neutral-300">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/10 text-white"><IconMail size={18} /></div>
                  <div>
                    <span className="block text-[10px] text-neutral-400 uppercase">Support Email</span>
                    <strong className="text-white">support@zerocraft.in</strong>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/10 text-white"><IconPhone size={18} /></div>
                  <div>
                    <span className="block text-[10px] text-neutral-400 uppercase">Phone Concierge</span>
                    <strong className="text-white">+1 (555) 392-0192</strong>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/10 text-white"><IconMapPin size={18} /></div>
                  <div>
                    <span className="block text-[10px] text-neutral-400 uppercase">Studio Flagship</span>
                    <strong className="text-white">742 Design Avenue, San Francisco, CA 94107</strong>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/10 text-white"><IconClock size={18} /></div>
                  <div>
                    <span className="block text-[10px] text-neutral-400 uppercase">Hours</span>
                    <strong className="text-white">Mon — Fri: 9:00 AM – 6:00 PM PST</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive FAQ Accordion */}
            <div id="faq" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 space-y-4 shadow-xs">
              <h3 className="text-base font-bold font-mono uppercase tracking-wider text-neutral-900 dark:text-white pb-3 border-b border-neutral-200 dark:border-neutral-800">
                Frequently Asked Questions
              </h3>

              <div className="space-y-2">
                {faqs.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div key={idx} className="border-b border-neutral-100 dark:border-neutral-800 pb-2">
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full py-2.5 flex items-center justify-between text-left text-xs font-semibold text-neutral-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400"
                      >
                        <span>{faq.q}</span>
                        <IconChevronDown size={16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen && (
                        <p className="text-xs text-neutral-500 font-light leading-relaxed pb-2 font-mono">
                          {faq.a}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
