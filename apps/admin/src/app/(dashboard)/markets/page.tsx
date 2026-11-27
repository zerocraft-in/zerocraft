import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@zerocraft/ui/button";

export default async function MarketsPage() {
  return (
    <PageHeader
      actions={
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
          <Button variant="outline" size="sm">
            Graph view
          </Button>

          <Button size="sm" render={<Link href="/markets/new" />}>
            Create market
          </Button>
        </div>
      }
    >
      coming soon
    </PageHeader>
  );
}
