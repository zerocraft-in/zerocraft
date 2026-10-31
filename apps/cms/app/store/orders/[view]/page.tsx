import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft, IconInfoCircle } from "@tabler/icons-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const views: Record<string, { title: string; description: string; detail: string }> = {
  drafts: {
    title: "Draft orders",
    description: "Review draft orders before they are confirmed for fulfillment.",
    detail: "Draft orders are not stored by the current commerce schema. Orders appear here after draft-order support is connected.",
  },
  "abandoned-checkouts": {
    title: "Abandoned checkouts",
    description: "Follow up with customers who left checkout before placing an order.",
    detail: "Checkout sessions are not currently persisted by this store, so abandoned checkouts are not available yet.",
  },
  "purchase-orders": {
    title: "Purchase orders",
    description: "Track supplier purchase orders and incoming stock for the store.",
    detail: "Purchase order tracking is ready for the Shopify-style navigation and will show supplier records when procurement data is connected.",
  },
};

export default async function OrderViewPage({ params }: { params: Promise<{ view: string }> }) {
  const { view } = await params;
  const content = views[view];
  if (!content) notFound();

  return <main className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-screen-xl flex-col gap-6 pb-12">
    <header>
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" render={<Link href="/orders" />} nativeButton={false}><IconArrowLeft />All orders</Button>
      <h1 className="text-3xl font-semibold tracking-tight">{content.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{content.description}</p>
    </header>
    <Card className="flex-1">
      <CardHeader><CardTitle>{content.title}</CardTitle><CardDescription>Order workspace</CardDescription></CardHeader>
      <CardContent><Alert><IconInfoCircle /><AlertTitle>Not connected yet</AlertTitle><AlertDescription>{content.detail}</AlertDescription></Alert></CardContent>
    </Card>
  </main>;
}

