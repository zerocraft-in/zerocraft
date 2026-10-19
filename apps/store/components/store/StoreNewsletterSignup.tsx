"use client";

import { FormEvent, useState } from "react";
import { trackStoreEvent } from "@/lib/commerce/store-events";

export default function StoreNewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/store/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Newsletter signup is temporarily unavailable.");
      setStatus("success");
      setMessage(payload.message || "You are on the list.");
      trackStoreEvent("newsletter_signup", { source: "store_home" });
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Newsletter signup is temporarily unavailable.");
    }
  }

  return (
    <div className="w-full max-w-md">
      <form onSubmit={submit} className="flex w-full gap-2">
        <label className="sr-only" htmlFor="store-newsletter-email">Email address</label>
        <input id="store-newsletter-email" value={email} onChange={(event) => setEmail(event.target.value)} required type="email" placeholder="Enter your email" className="min-w-0 flex-1 rounded-[5px] border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/45 focus:border-[#f5b544]" />
        <button type="submit" disabled={status === "loading"} className="rounded-[5px] bg-[#e34d2e] px-5 py-3 text-[10px] font-black uppercase tracking-wider text-white disabled:cursor-wait disabled:opacity-60">{status === "loading" ? "Joining..." : "Subscribe"}</button>
      </form>
      {message && <p className={`mt-2 text-xs ${status === "error" ? "text-[#ffb0a0]" : "text-white/70"}`} role={status === "error" ? "alert" : "status"}>{message}</p>}
    </div>
  );
}
