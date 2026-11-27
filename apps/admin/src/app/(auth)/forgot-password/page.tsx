import { redirect } from "next/navigation";

import { getAccountsOrigin } from "@/lib/auth/accounts";

export const dynamic = "force-dynamic";

/** Password recovery is centralized in the accounts application. */
export default function ForgotPasswordPage() {
  redirect(new URL("/forgot-password", getAccountsOrigin()).toString());
}
