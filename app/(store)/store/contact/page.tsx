"use client";

import { useState } from "react";
import Breadcrumbs from "@/components/store/Breadcrumbs";
import { studio } from "@/lib/studio-config";
import { IconArrowUpRight, IconMail } from "@tabler/icons-react";

const questions = [
  { question: "Can I place an order now?", answer: "The catalog is a preview. When ordering is configured, submitting an order creates a request for studio confirmation. No online payment is collected." },
  { question: "Are product details and delivery estimates final?", answer: "No. The studio will confirm product specifications, availability, pricing, and delivery before fulfillment." },
  { question: "How can I ask about a custom product?", answer: "Send us a brief description by email. Include the item, quantity, and any personalization you have in mind." },
];

export default function StoreContactPage() {
  const [openQuestion, setOpenQuestion] = useState<number | null>(0);
  return (
    <div className="container-site min-h-screen py-8">
      <Breadcrumbs items={[{ label: "Contact" }]} />
      <div className="my-12 grid gap-12 border-t border-neutral-200 pt-12 dark:border-neutral-800 lg:grid-cols-2">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-lime-600">Store / Contact</span>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight sm:text-6xl">Let&apos;s talk about your idea.</h1>
          <p className="mt-6 max-w-lg text-neutral-600 dark:text-neutral-400">Ask about a product, a custom request, or an existing order. We&apos;ll confirm what&apos;s available before any fulfillment.</p>
          <a href={`mailto:${studio.email}?subject=Zerocraft%20Store%20Inquiry`} className="mt-8 inline-flex items-center gap-3 rounded-full bg-neutral-950 px-6 py-4 font-mono text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-lime-400 hover:text-black dark:bg-white dark:text-black">
            <IconMail size={18} /> Email the studio <IconArrowUpRight size={18} />
          </a>
          <p className="mt-5 font-mono text-xs text-neutral-500">{studio.email} · Tenkasi, Tamil Nadu, India</p>
        </div>
        <section id="faq" aria-label="Store questions" className="space-y-2">
          {questions.map((item, index) => (
            <div key={item.question} className="border-b border-neutral-200 py-4 dark:border-neutral-800">
              <button type="button" aria-expanded={openQuestion === index} onClick={() => setOpenQuestion(openQuestion === index ? null : index)} className="flex w-full items-center justify-between gap-6 text-left font-semibold">
                {item.question}<span aria-hidden>{openQuestion === index ? "−" : "+"}</span>
              </button>
              {openQuestion === index && <p className="mt-4 max-w-lg text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{item.answer}</p>}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
