import type { Metadata } from "next";
import Link from "next/link";
import { OtpLoginForm } from "@/components/auth/otp-login-form";

export const metadata: Metadata = {
  title: "Studio sign in | Zerocraft Studio",
  description: "Secure sign in to the Zerocraft Studio workspace.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0c0e0d] px-4 py-12 text-white"><div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(to right,rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.06) 1px,transparent 1px)", backgroundSize: "44px 44px" }} /><div className="relative z-10 w-full max-w-md"><Link href="/" className="mb-10 inline-flex items-center gap-3" aria-label="Zerocraft Studio home"><svg viewBox="0 0 24 24" aria-hidden="true" className="size-9 fill-[#c8fb00]"><path d="M5.16.43c4.97,7.25,9.93,8.51,14.9,3.78,1.09,1.24,1.94,2.48,2.53,3.71-2.41,3.97-7.69,4.08-11.59,6.41,4.15-.64,8.18-.19,12.08,1.37-.44,1.21-1.13,2.42-2.07,3.63-5.6-5.34-11.2-3.92-16.8,4.26-1.48-1.89-2.57-3.78-3.3-5.67,2.87-6.36,8.78-7.1,12.63-8.59-3.92-.16-7.97-1.26-12.14-3.32.88-1.86,2.13-3.72,3.76-5.58Z" /></svg><span className="text-sm font-extrabold leading-[.95] tracking-[-.04em]">ZEROCRAFT<br />STUDIO</span></Link><p className="mb-2 font-mono text-[10px] uppercase tracking-[.18em] text-[#c8fb00]">Studio access / 01</p><h1 className="mb-6 text-4xl font-semibold tracking-[-.06em]">Welcome back.</h1><OtpLoginForm /><p className="mt-6 text-center text-xs text-white/45">Authorized studio accounts only. New accounts require access from an administrator.</p></div></main>;
}
