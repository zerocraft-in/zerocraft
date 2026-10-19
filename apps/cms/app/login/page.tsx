import type { Metadata } from "next";
import Link from "next/link";
import { OtpLoginForm } from "@/components/auth/otp-login-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconShieldLock } from "@tabler/icons-react";

export const metadata: Metadata = {
  title: "Studio Sign In | Zerocraft Studio",
  description: "Secure authentication portal for the Zerocraft Studio CMS.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <Link
            href="/"
            className="group inline-flex items-center gap-3 focus:outline-none"
            aria-label="Zerocraft Studio home"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform duration-200 group-hover:scale-105">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current">
                <path d="M5.16.43c4.97,7.25,9.93,8.51,14.9,3.78,1.09,1.24,1.94,2.48,2.53,3.71-2.41,3.97-7.69,4.08-11.59,6.41,4.15-.64,8.18-.19,12.08,1.37-.44,1.21-1.13,2.42-2.07,3.63-5.6-5.34-11.2-3.92-16.8,4.26-1.48-1.89-2.57-3.78-3.3-5.67,2.87-6.36,8.78-7.1,12.63-8.59-3.92-.16-7.97-1.26-12.14-3.32.88-1.86,2.13-3.72,3.76-5.58Z" />
              </svg>
            </span>
            <div className="text-left leading-none">
              <span className="block text-sm font-black uppercase tracking-tight">ZEROCRAFT</span>
              <span className="text-[10px] font-mono tracking-widest text-muted-foreground">STUDIO PORTAL</span>
            </div>
          </Link>

          <div className="pt-2">
            <Badge variant="outline" className="h-6 font-mono text-[10px] uppercase tracking-wider">
              <IconShieldLock size={12} className="mr-1.5" />
              SECURE CMS ACCESS
            </Badge>
          </div>
        </div>

        <Card className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
          <CardHeader className="space-y-1 border-b px-0 pb-6">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Welcome back.
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Sign in to manage creative works, orders, appointments, and client operations.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-0 pt-6">
            <OtpLoginForm />
          </CardContent>
        </Card>

        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Authorized studio team accounts only. New staff accounts must be provisioned by an administrator.
          </p>
          <div className="pt-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>Return to Zerocraft website</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
