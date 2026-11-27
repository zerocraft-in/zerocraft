import { redirect } from "next/navigation";

import { safeRedirectPath } from "@zerocraft/auth-core";

import { getAccountsOrigin, getAdminOrigin } from "@/lib/auth/accounts";

export const dynamic = "force-dynamic";

type SignupPageProps = {
  readonly searchParams: Promise<{
    next?: string;
    token?: string;
  }>;
};

/**
 * Central accounts signup entry point. New identities are created by the
 * accounts application, never by the admin application.
 */
export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const fallback = params.token ? "/accept-invite" : "/onboarding";
  const nextPath = safeRedirectPath(params.next, fallback);

  const next = new URL(nextPath, getAdminOrigin());
  if (params.token) next.searchParams.set("token", params.token);

  const target = new URL("/signup", getAccountsOrigin());
  target.searchParams.set("next", next.toString());

  redirect(target.toString());
}
