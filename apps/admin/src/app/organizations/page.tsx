import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, Building2 } from "lucide-react";

import { selectActiveOrganization } from "@/app/(dashboard)/organization/actions";
import { Button } from "@zerocraft/ui/button";
import {
  ACTIVE_ORGANIZATION_COOKIE,
  requireUser,
} from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Choose an organization",
};

export const dynamic = "force-dynamic";

export default async function OrganizationsPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login?next=%2Forganizations");

  const supabase = await createServerSupabaseClient();
  const { data: memberships, error } = await supabase
    .from("organization_members")
    .select("organization_id, organizations ( name, slug )")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error) {
    console.error("Organization list query failed.", {
      code: error.code,
      message: error.message,
    });
  }

  if (!memberships?.length) redirect("/onboarding");
  if (memberships.length === 1) redirect("/overview");

  const selected = (await cookies()).get(ACTIVE_ORGANIZATION_COOKIE)?.value;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-lg items-center px-5 py-10 sm:px-8">
      <section className="w-full rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg border bg-muted/50">
            <Building2 className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.02em]">
              Choose an organization
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Select the workspace you want to manage.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {memberships.map((membership) => {
            const organization = membership.organizations as unknown as {
              name: string;
              slug: string;
            } | null;
            const isCurrent = membership.organization_id === selected;

            return (
              <form
                key={membership.organization_id}
                action={async () => {
                  "use server";
                  const result = await selectActiveOrganization(
                    membership.organization_id,
                  );
                  if (!result.ok) redirect("/organizations?error=selection");
                  redirect("/overview");
                }}
              >
                <button
                  type="submit"
                  className="group flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {organization?.name ?? "Organization"}
                    </span>
                    {organization?.slug ? (
                      <span className="mt-0.5 block truncate font-mono text-[0.625rem] tracking-[0.08em] text-muted-foreground uppercase">
                        {organization.slug}
                      </span>
                    ) : null}
                  </span>
                  {isCurrent ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[0.5625rem] tracking-[0.1em] text-muted-foreground uppercase">
                      Current
                    </span>
                  ) : null}
                  <ArrowRight
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                    aria-hidden="true"
                  />
                </button>
              </form>
            );
          })}
        </div>

        <div className="mt-6 border-t pt-5">
          <Button
            variant="outline"
            className="w-full"
            render={<a href="/auth/logout">Sign out</a>}
          >
            Sign out
          </Button>
        </div>
      </section>
    </main>
  );
}
