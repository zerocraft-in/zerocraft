import { requirePermission } from "@/lib/auth/session";
import { SalesChannelsManager } from "./sales-channels-manager";

export default async function SalesChannelsPage() {
  const context = await requirePermission("sales_channels.view");

  const [
    channelsRes,
    installationsRes,
  ] = await Promise.all([
    fetch("/api/sales-channels", { cache: "no-store" }),
    fetch("/api/sales-channels/installations", { cache: "no-store" }),
  ]);

  let channels: Array<{
    id: string;
    key: string;
    name: string;
    description: string | null;
    category: string | null;
    provider_key: string | null;
    icon: string | null;
    capabilities: Record<string, unknown>;
    configuration_schema: Record<string, unknown>;
    status: string;
    is_available: boolean;
    created_at: string;
    updated_at: string;
  }> = [];

  let installations: Array<{
    id: string;
    organization_id: string;
    store_id: string;
    channel_id: string;
    status: string;
    external_account_id: string | null;
    external_account_name: string | null;
    external_account_metadata: Record<string, unknown>;
    installed_by: string;
    installed_at: string | null;
    connected_at: string | null;
    disconnected_at: string | null;
    last_synced_at: string | null;
    last_error_code: string | null;
    created_at: string;
    updated_at: string;
    channels: {
      id: string;
      key: string;
      name: string;
      description: string | null;
      category: string | null;
      provider_key: string | null;
      icon: string | null;
      capabilities: Record<string, unknown>;
      configuration_schema: Record<string, unknown>;
      status: string;
      is_available: boolean;
    } | null;
    stores: {
      id: string;
      name: string;
      slug: string;
      status: string;
    } | null;
  }> = [];

  if (channelsRes.ok) {
    const json = await channelsRes.json();
    if (json.ok) channels = json.channels;
  }
  if (installationsRes.ok) {
    const json = await installationsRes.json();
    if (json.ok) installations = json.installations;
  }

  return (
    <SalesChannelsManager
      channels={channels}
      installations={installations}
      canManage={context.permissions.has("sales_channels.manage")}
    />
  );
}
