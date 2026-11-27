
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { OrdersComingSoon } from "./_components/orders-coming-soon";

import { Button } from "@zerocraft/ui/button";

export default async function OrdersPage() {
  return (
    <PageHeader
      actions={
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
          <Button variant="outline" size="sm">
            Export
          </Button>

          <Button size="sm" render={<Link href="/orders/new" />}>
            Create order
          </Button>
        </div>
      }
    >
      <OrdersComingSoon />
    </PageHeader>
  );
}
