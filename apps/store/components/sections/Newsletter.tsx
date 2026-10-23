"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";

export default function Newsletter() {
  const { notify } = useStore();
  const [email, setEmail] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    if (r?.ok) {
      notify("You’re on the first-show list!");
      setEmail("");
    } else notify("Please enter a valid email");
  };
  return (
    <div className="newsletter-section">
      <div className="storefront-container">
        <div>
          <div className="storefront-kicker storefront-mono">Admit one</div>
          <h2 className="storefront-display">
            Join the <em>first-show list.</em>
          </h2>
        </div>
        <form onSubmit={submit} noValidate>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email for early access"
            aria-label="Email address"
          />
          <button>Get in</button>
        </form>
      </div>
    </div>
  );
}
