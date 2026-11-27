"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { createStudioSupabaseBrowserClient } from "@/lib/studio-supabase-browser";
import { Alert, AlertDescription } from "@zerocraft/ui/components/alert";
import { Toaster, toast } from "@zerocraft/ui/components/toast";

export default function ResetPasswordPage() {
  const supabase = createStudioSupabaseBrowserClient();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) setError(updateError.message);
    else toast.add({ title: "Password updated", description: "You can continue to your Studio workspace.", type: "success" });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#0a0a0b] px-4 text-[#f4f4f5]">
      <Toaster />
      <form onSubmit={submit} className="w-full max-w-[440px] rounded-[40px] border border-white/[.14] bg-white/[.07] p-8 shadow-2xl backdrop-blur-[30px]">
        <Link href="/sign-in" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="size-4" /> Back to sign in</Link>
        <h1 className="mt-7 text-[34px] font-light tracking-[-.02em]">Set a new password</h1>
        <p className="mt-2 text-sm text-zinc-400">Choose a new password for your ZeroCraft Studio account.</p>
        <label htmlFor="new-password" className="mb-1.5 mt-6 block text-[13px] text-zinc-300">New password</label>
        <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-[52px] w-full rounded-[20px] border border-white/[.16] bg-white/[.06] px-[18px] text-[15px] outline-none placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-orange-300/50" />
        <label htmlFor="confirm-password" className="mb-1.5 mt-5 block text-[13px] text-zinc-300">Confirm password</label>
        <input id="confirm-password" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-[52px] w-full rounded-[20px] border border-white/[.16] bg-white/[.06] px-[18px] text-[15px] outline-none placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-orange-300/50" />
        <button type="submit" disabled={loading} className="mt-6 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full border border-white bg-white px-4 text-[15px] font-medium text-[#0a0a0b] disabled:opacity-60">{loading ? "Updating…" : "Update password"} {!loading && <Check className="size-4" />}</button>
        {error && <Alert variant="destructive" className="mt-4 border-red-300/20 bg-red-300/10 text-red-100"><AlertDescription>{error}</AlertDescription></Alert>}
      </form>
    </main>
  );
}
