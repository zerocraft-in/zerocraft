import { ComingSoonPage } from "@/components/studio/coming-soon-page";
export default function SchedulingPage() {
  return (
    <ComingSoonPage
      area="Staff"
      title="Scheduling"
      description="Plan staff shifts and assign work around appointments."
      plannedFeatures={[
        "Staff availability",
        "Shift planning",
        "Appointment workload view",
      ]}
    />
  );
}
