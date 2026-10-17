"use client";

import { useState } from "react";
import Breadcrumbs from "@/components/store/Breadcrumbs";
import { studio } from "@/lib/studio-config";
import { IconArrowUpRight, IconMail } from "@/components/store/StoreIcon";

const questions = [
  ["Can I place an order now?", "Yes, you can build a cart and submit an order request. The studio reviews availability and confirms the final details before fulfillment."],
  ["How long does dispatch take?", "Most studio-reviewed orders are packed within 2–4 working days. Made-to-order pieces may take a little longer."],
  ["Can I ask about a custom product?", "Send a short brief with the product, quantity, dimensions and personalization you have in mind."],
  ["What about returns?", "Unused and undamaged products can be requested for return within the published return window. Personalised products are handled separately."],
];

export default function StoreContactPage() {
  const [openQuestion, setOpenQuestion] = useState(0);
  return <div className="min-h-screen bg-[#f8f7f3] px-5 py-8 text-[#151515] sm:px-8 lg:px-14"><div className="mx-auto max-w-7xl"><Breadcrumbs items={[{ label: "Contact" }]} /><div className="my-10 grid gap-6 lg:grid-cols-[.9fr_1.1fr]"><section className="rounded-[10px] bg-[#211b16] p-8 text-white sm:p-12"><p className="text-[10px] font-black uppercase tracking-[.25em] text-[#f5b544]">Store / Contact</p><h1 className="mt-6 max-w-xl font-secondary text-5xl font-bold leading-[.92] tracking-[-.05em] sm:text-7xl">Let&apos;s talk about the next scene.</h1><p className="mt-7 max-w-lg text-sm leading-6 text-white/70">Ask about a product, a custom request or an existing order. We will confirm what is available before fulfillment.</p><a href={`mailto:${studio.email}?subject=Zerocraft%20Store%20Inquiry`} className="mt-8 inline-flex items-center gap-3 rounded-[5px] bg-white px-5 py-3 text-[10px] font-black uppercase tracking-wider text-[#151311] transition hover:bg-[#f5b544]"><IconMail size={16} /> Email the studio <IconArrowUpRight size={15} /></a><p className="mt-5 text-xs text-white/45">{studio.email} · Tenkasi, Tamil Nadu, India</p></section><section className="rounded-[10px] border border-black/10 bg-white/75 p-6 sm:p-10" aria-label="Store questions"><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#e34d2e]">Need to know</p><h2 className="mt-3 font-secondary text-4xl font-bold leading-none tracking-[-.04em]">Answers before you order.</h2><div className="mt-8 divide-y divide-black/10">{questions.map(([question, answer], index) => <div key={question}><button type="button" aria-expanded={openQuestion === index} onClick={() => setOpenQuestion(openQuestion === index ? -1 : index)} className="flex w-full items-center justify-between gap-5 py-5 text-left text-sm font-black"><span>{question}</span><span className="text-xl font-normal text-[#e34d2e]" aria-hidden>{openQuestion === index ? "−" : "+"}</span></button>{openQuestion === index && <p className="max-w-xl pb-5 text-sm leading-6 text-black/60">{answer}</p>}</div>)}</div></section></div></div></div>;
}
