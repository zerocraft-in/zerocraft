import { ComingSoonPage } from "@/components/studio/coming-soon-page";
export default function TransactionsPage() {
  return (
    <ComingSoonPage
      area="Payments & invoices"
      title="Transactions"
      description="Review payments, refunds, and settlement activity."
      plannedFeatures={[
        "Payment provider ledger",
        "Refund workflow",
        "Settlement reconciliation",
      ]}
    />
  );
}
