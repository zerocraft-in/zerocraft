import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { normalizeEmail } from "@zerocraft/auth-core";
import { AuthShell } from "@/components/layout/auth-shell";
import { OtpForm } from "./otp-form";

export const metadata: Metadata = { title: "Enter code · Zerocraft" };
export const dynamic = "force-dynamic";

type OtpPageProps = {
  readonly searchParams: Promise<{ email?: string; next?: string }>;
};

export default async function OtpPage({ searchParams }: OtpPageProps) {
  const params = await searchParams;
  const validation = normalizeEmail(params.email ?? "");
  const next = params.next ?? "";
  const loginHref = `/login${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  if (!validation.ok) redirect(loginHref);

  const email = validation.email;

  return (
    <AuthShell>
      <section className="auth-content zc-center">
        <div className="auth-mark" aria-label="Zerocraft" data-reveal>
          Z
        </div>
        <h1 className="auth-title auth-title--duo" data-reveal>
          <span>Enter the code sent to</span>
          <span>{email}</span>
        </h1>
        <div data-reveal>
          <OtpForm email={email} next={next} />
        </div>
        <Link href={loginHref} className="zc-text-link" data-reveal>
          Use a different email
        </Link>
      </section>
    </AuthShell>
  );
}