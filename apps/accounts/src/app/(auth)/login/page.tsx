import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { authErrorMessage } from "@zerocraft/auth-core";
import { getPublicAuthConfig } from "@/lib/auth/config";
import { getOptionalUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";
import { AuthShell } from "@/components/layout/auth-shell";

export const metadata: Metadata = { title: "Log in · Zerocraft" };
export const dynamic = "force-dynamic";

type LoginPageProps = {
  readonly searchParams: Promise<{
    next?: string;
    error?: string;
    logged_out?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const user = await getOptionalUser();
  const config = getPublicAuthConfig();

  if (user && !params.error) redirect("/");

  const initialError =
    params.error === "invalid_link" || params.error === "expired_link"
      ? authErrorMessage(params.error)
      : params.error === "handoff_failed"
        ? authErrorMessage("handoff_failed")
        : undefined;

  return (
    <AuthShell>
      <LoginForm
        next={params.next ?? ""}
        initialError={initialError}
        googleEnabled={config.googleEnabled}
        appleEnabled={config.appleEnabled}
        loggedOut={params.logged_out === "1"}
      />
    </AuthShell>
  );
}
