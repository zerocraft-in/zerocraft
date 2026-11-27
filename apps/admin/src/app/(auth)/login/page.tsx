import { redirect } from "next/navigation";

import { safeRedirectPath } from "@zerocraft/auth-core";

import { getAccountsOrigin, getAdminOrigin } from "@/lib/auth/accounts";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  readonly searchParams: Promise<{
    next?: string;
    token?: string;
    error?: string;
    registered?: string;
  }>;
};

/**
 * Central accounts login entry point.
 *
 * The admin application no longer owns credential forms: it forwards to the
 * accounts gateway with a validated absolute return URL on this origin.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = safeRedirectPath(params.next, "/overview");

  const next = new URL(nextPath, getAdminOrigin());
  if (params.token) next.searchParams.set("token", params.token);

  const target = new URL("/login", getAccountsOrigin());
  target.searchParams.set("next", next.toString());
  if (params.error) target.searchParams.set("error", params.error);
  if (params.registered === "1") target.searchParams.set("registered", "1");

  redirect(target.toString());
}
