import { CustomerSegmentsPage } from "@/components/studio/customers-workspaces";

/**
 * Store customer entry point. Segment/company routes remain available under
 * their existing paths while the customer workspace is expanded.
 */
export default function StoreCustomersPage() {
  return <CustomerSegmentsPage />;
}
