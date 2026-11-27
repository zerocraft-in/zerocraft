"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Mail, Sparkles } from "lucide-react";
import { createStudioSupabaseBrowserClient } from "@/lib/studio-supabase-browser";
import { Alert, AlertDescription } from "@zerocraft/ui/components/alert";
import { Toaster, toast } from "@zerocraft/ui/components/toast";

function safeNextPath() {
  if (typeof window === "undefined") return "/studio";
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/studio";
}

export default function SignInPage() {
  const supabase = createStudioSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const callbackError = new URLSearchParams(window.location.search).get("error");
    if (callbackError) setError(callbackError);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!email) throw new Error("Enter your work email.");

      if (!codeSent) {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false },
        });
        if (otpError) throw otpError;
        setCodeSent(true);
        toast.add({ title: "Verification code sent", description: "Check your email for the six-digit verification code.", type: "success" });
      } else {
        const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
        if (verifyError) throw verifyError;
        window.location.assign(safeNextPath());
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function continueWithGoogle() {
    setError("");
    setLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNextPath())}` },
    });
    if (oauthError) {
      setError(oauthError.message);
      toast.add({ title: "Google sign-in failed", description: oauthError.message, type: "error" });
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#0a0a0b] text-[#f4f4f5]">
      <Toaster />
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-20 size-[760px] rounded-full bg-[radial-gradient(circle_at_40%_40%,#ff6a2b,#b3261e_55%,transparent_72%)] opacity-55 blur-[90px]" />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-20 bg-[url('/noise.svg')] opacity-20 mix-blend-screen" />

      <section className="relative z-10 flex min-h-screen flex-1 flex-col justify-between p-12 max-[900px]:min-h-[430px] max-[900px]:p-8 max-[520px]:p-6" aria-label="ZeroCraft Studio">
        <Link href="/" className="flex w-fit items-center gap-3 text-xl font-medium hover:text-orange-200">
          <span className="grid size-10 place-items-center rounded-[14px] bg-white text-[#0a0a0b]"><Sparkles className="size-5" /></span>
          ZeroCraft Studio
        </Link>
        <div>
          <h1 className="max-w-[620px] text-[clamp(48px,6vw,72px)] font-extralight leading-[1.02] tracking-[-.045em]">Every inquiry has an owner.</h1>
          <span className="mt-5 block font-mono text-[15px] tracking-[.06em] text-orange-100">From first contact to finished work</span>
        </div>
        <p className="text-sm text-orange-100">Private workspace for the ZeroCraft team</p>
      </section>

      <section className="relative z-10 grid flex-1 place-items-center p-8 max-[900px]:p-6 max-[520px]:p-4">
        <form onSubmit={submit} className="w-full max-w-[440px] rounded-[44px] border border-white/[.14] bg-white/[.07] p-9 shadow-2xl backdrop-blur-[30px] max-[520px]:rounded-[32px] max-[520px]:p-6" aria-label="Sign in">
          <h2 className="text-[34px] font-light leading-tight tracking-[-.02em]">Sign in</h2>
          <p className="mt-2 text-[15px] text-zinc-400">Use email OTP or continue with Google.</p>

          <label htmlFor="email" className="mb-1.5 mt-5 block text-[13px] text-zinc-300">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-4 size-4 text-zinc-500" />
            <input id="email" type="email" placeholder="name@company.com" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-[52px] w-full rounded-[20px] border border-white/[.16] bg-white/[.06] px-[18px] pl-11 text-[15px] outline-none placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-orange-300/50" />
          </div>

          {codeSent && <>
            <label htmlFor="code" className="mb-1.5 mt-5 block text-[13px] text-zinc-300">Verification code</label>
            <input id="code" inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className="h-[52px] w-full rounded-[20px] border border-white/[.16] bg-white/[.06] px-[18px] text-center text-lg tracking-[.3em] outline-none placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-orange-300/50" />
          </>}

          <button type="submit" disabled={loading} className="mt-6 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full border border-white bg-white px-4 text-[15px] font-medium text-[#0a0a0b] transition hover:bg-orange-100 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-orange-300">
            {loading ? "Working…" : codeSent ? "Verify code" : "Send email code"} <ArrowRight className="size-4" />
          </button>

          <div className="my-5 flex items-center gap-3.5 text-[13px] text-zinc-400"><i className="h-px flex-1 bg-white/[.14]" />or<i className="h-px flex-1 bg-white/[.14]" /></div>

          <button type="button" disabled={loading} onClick={continueWithGoogle} className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full border border-white/[.18] bg-white/[.06] px-4 text-[15px] font-medium transition hover:bg-white/[.12] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-orange-300">
            <span className="font-semibold">G</span> Continue with Google
          </button>

          {error && <Alert variant="destructive" className="mt-4 border-red-300/20 bg-red-300/10 text-red-100"><AlertDescription>{error}</AlertDescription></Alert>}
        </form>
      </section>
    </main>
  );
}
