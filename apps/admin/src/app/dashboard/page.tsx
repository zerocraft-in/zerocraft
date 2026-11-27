import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACTIVE_ORGANIZATION_COOKIE } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Canonical post-authentication destination for the admin application.
 *
 * Organization routing is enforced on the server from verified memberships:
 *  - no active membership  -> onboarding
 *  - one membership        -> workspace (auto-selected)
 *  - several, one selected -> workspace
 *  - several, none selected-> organization selector
 */
export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=%2Fdashboard");
  }

  const { data: memberships, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error) {
    console.error("Dashboard organization routing query failed.", {
      code: error.code,
      message: error.message,
    });
    redirect("/onboarding");
  }

  if (!memberships || memberships.length === 0) {
    redirect("/onboarding");
  }

  if (memberships.length === 1) {
    redirect("/overview");
  }

  const selected = (await cookies()).get(ACTIVE_ORGANIZATION_COOKIE)?.value;
  const hasValidSelection =
    selected &&
    memberships.some((membership) => membership.organization_id === selected);

  if (hasValidSelection) {
    redirect("/overview");
  }

  redirect("/organizations");
}
