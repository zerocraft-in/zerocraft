import { ComingSoonPage } from "@/components/studio/coming-soon-page";
export default function ChannelsPage() {
  return (
    <ComingSoonPage
      area="Channels"
      title="Storefront channels"
      description="Manage product publishing across connected sales channels."
      plannedFeatures={[
        "Channel connection management",
        "Catalog sync status",
        "Per-channel publishing controls",
      ]}
    />
  );
}
