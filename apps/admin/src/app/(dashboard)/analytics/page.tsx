import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@zerocraft/ui/button";

export default async function analyticsPage() {
  return (
    <PageHeader
      actions={
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
   
          <Button variant="outline" size="sm">
            Try targets
          </Button>

          <Button size="sm" render={<Link href="/analytics/new" />}>
            New exploration
          </Button>
        </div>
      }
    >
      coming soon
    </PageHeader>
  );
}
