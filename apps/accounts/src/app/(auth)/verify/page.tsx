import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { normalizeEmail } from "@zerocraft/auth-core";
import { AuthShell } from "@/components/layout/auth-shell";
import { ResendForm } from "./resend-form";

export const metadata: Metadata = { title: "Check your inbox · Zerocraft" };
export const dynamic = "force-dynamic";

type VerifyPageProps = {
  readonly searchParams: Promise<{ email?: string; next?: string; sent?: string }>;
};

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const params = await searchParams;
  const validation = normalizeEmail(params.email ?? "");
  const next = params.next ?? "";
  const loginHref = `/login${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  if (!validation.ok) redirect(loginHref);

  const email = validation.email;
  const sent = params.sent !== "0";

  return (
    <AuthShell>
      <section className="auth-content zc-center">
        <div className="auth-mark" aria-label="Zerocraft" data-reveal>
          Z
        </div>
        <h1 className="auth-title auth-title--duo" data-reveal>
          <span>{sent ? "Verification link sent to" : "We couldn't send a link to"}</span>
          <span>{email}</span>
        </h1>
        <div data-reveal>
          <ResendForm email={email} next={next} initialSent={sent} />
        </div>
        <Link href={loginHref} className="zc-text-link" data-reveal>
          Use a different email
        </Link>
      </section>
    </AuthShell>
  );
}