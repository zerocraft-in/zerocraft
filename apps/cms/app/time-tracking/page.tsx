import { ComingSoonPage } from "@/components/studio/coming-soon-page";
export default function TimeTrackingPage() {
  return (
    <ComingSoonPage
      area="Staff"
      title="Time tracking"
      description="Review team hours, approvals, and labor trends."
      plannedFeatures={[
        "Time entry workflow",
        "Approval queue",
        "Labor cost reporting",
      ]}
    />
  );
}
