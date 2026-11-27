import { requireOrganization, NO_ACTIVE_MEMBERSHIP_ERROR } from "@/lib/auth/session";
import DashboardShell from "@/components/layout/dashboard-shell";
import { ORGANIZATION_SELECTION_REQUIRED_ERROR } from "@/lib/auth/session";
import { DirtyProvider } from "@/components/providers/dirty-provider";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  let context;
  try {
    context = await requireOrganization();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Unauthenticated → login. No active membership → onboarding.
    if (message === NO_ACTIVE_MEMBERSHIP_ERROR) {
      redirect("/onboarding");
    }
    if (message === ORGANIZATION_SELECTION_REQUIRED_ERROR) {
      redirect("/organizations");
    }
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();
  const { data: installedChannels, error: installedChannelsError } = await supabase
    .schema("sales_channels")
    .from("channel_installations")
    .select("status, channel_id")
    .eq("organization_id", context.activeOrganization!.id)
    .in("status", ["active", "paused"]);

  if (installedChannelsError) {
    console.error("Installed sales channels query failed.", {
      message: installedChannelsError.message,
    });
  }

  const installedChannelIds = (installedChannels ?? []).map(
    (installation) => installation.channel_id,
  );
  const { data: installedCatalogChannels, error: installedCatalogError } =
    installedChannelIds.length > 0
      ? await supabase
          .schema("sales_channels")
          .from("channels")
          .select("id, key")
          .in("id", installedChannelIds)
      : { data: [], error: null };

  if (installedCatalogError) {
    console.error("Installed sales channel catalogue query failed.", {
      message: installedCatalogError.message,
    });
  }

  const installedSalesChannelKeys = (installedCatalogChannels ?? []).map(
    (channel) => channel.key,
  );

  return (
    <DirtyProvider>
      <DashboardShell
        user={context.user}
        memberships={context.memberships}
        activeOrganization={context.activeOrganization}
        installedSalesChannelKeys={installedSalesChannelKeys}
      >
        {children}
      </DashboardShell>
    </DirtyProvider>
  );
}
