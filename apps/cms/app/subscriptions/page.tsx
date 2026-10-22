import { ComingSoonPage } from "@/components/studio/coming-soon-page";
export default function SubscriptionsPage() {
  return (
    <ComingSoonPage
      area="Payments & invoices"
      title="Subscriptions"
      description="Build recurring relationships with clients and manage active plans."
      plannedFeatures={[
        "Recurring billing provider",
        "Plan and subscriber management",
        "Renewal and churn reporting",
      ]}
    />
  );
}
