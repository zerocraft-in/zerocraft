import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { IconArrowLeft, IconInfoCircle } from "@tabler/icons-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const sections: Record<string, { title: string; description: string; detail: string }> = {
  "purchase-orders": {
    title: "Purchase orders",
    description: "Track stock ordered from suppliers and when it is expected to arrive.",
    detail: "Supplier purchase orders are not connected to this store yet. Product inventory is available from the Inventory section.",
  },
  transfers: {
    title: "Transfers",
    description: "Move inventory between store locations and keep stock counts in sync.",
    detail: "Multi-location transfers are not connected to this store yet.",
  },
  "gift-cards": {
    title: "Gift cards",
    description: "Review gift card balances and issuance activity.",
    detail: "Gift card records are not connected to this store yet.",
  },
};

export default async function StoreSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "collections") redirect("/studio/store#categories");
  if (section === "inventory") redirect("/studio/store#products");
  const content = sections[section];
  if (!content) notFound();

  return <main className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-screen-xl flex-col gap-6 pb-12">
    <header>
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" render={<Link href="/studio/store" />} nativeButton={false}><IconArrowLeft />Store overview</Button>
      <p className="text-sm font-medium text-muted-foreground">Store / Products</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{content.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{content.description}</p>
    </header>
    <Card className="flex-1">
      <CardHeader><CardTitle>{content.title}</CardTitle><CardDescription>Commerce workspace</CardDescription></CardHeader>
      <CardContent><Alert><IconInfoCircle /><AlertTitle>Connection needed</AlertTitle><AlertDescription>{content.detail}</AlertDescription></Alert></CardContent>
    </Card>
  </main>;
}
