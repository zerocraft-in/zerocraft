import { Metadata } from "next";
import { OtpLoginForm } from "@/components/auth/otp-login-form";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign In | Your App Name",
  description: "Sign in to your account with a secure one-time code",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-black to-black flex flex-col items-center justify-center relative overflow-hidden px-4 py-8">
      {/* Animated background effects */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Main gradient background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/20 via-black to-black"></div>

        {/* Animated blur orbs */}
        <div className="absolute top-1/3 -left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl opacity-40 animate-pulse"></div>
        <div className="absolute bottom-1/3 -right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl opacity-40 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-2xl bg-white/[0.02] rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, 0.05) 75%, rgba(255, 255, 255, 0.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, 0.05) 75%, rgba(255, 255, 255, 0.05) 76%, transparent 77%, transparent)`,
            backgroundSize: "50px 50px",
          }}
        ></div>
      </div>

      {/* Content container */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center gap-8 max-w-sm">
        <div className="flex flex-col w-full gap-1 items-center justify-center py-2">
          <Link
            href="/"
            className="p-2 rounded-2xl w-max bg-muted hover:bg-accent border border-border transition-colors group"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-7 h-7 fill-primary "
            >
              <path d="M5.16.43c4.97,7.25,9.93,8.51,14.9,3.78,1.09,1.24,1.94,2.48,2.53,3.71-2.41,3.97-7.69,4.08-11.59,6.41,4.15-.64,8.18-.19,12.08,1.37-.44,1.21-1.13,2.42-2.07,3.63-5.6-5.34-11.2-3.92-16.8,4.26-1.48-1.89-2.57-3.78-3.3-5.67,2.87-6.36,8.78-7.1,12.63-8.59-3.92-.16-7.97-1.26-12.14-3.32.88-1.86,2.13-3.72,3.76-5.58h0Z" />
            </svg>
          </Link>

          <span className="text-sm font-medium text-primary">zerocraft</span>
        </div>
        {/* Login Form */}
        <OtpLoginForm />
      </div>

      {/* Background decorative elements */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-slate-500/50 to-transparent"></div>
    </div>
  );
}
