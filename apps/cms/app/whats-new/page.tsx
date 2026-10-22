import { ComingSoonPage } from "@/components/studio/coming-soon-page";
export default function WhatsNewPage() {
  return (
    <ComingSoonPage
      area="Product"
      title="Release notes"
      description="Discover the latest ZeroCraft tools, improvements, and product updates."
      plannedFeatures={[
        "Versioned release notes",
        "Migration notes",
        "Feature announcement history",
      ]}
    />
  );
}
