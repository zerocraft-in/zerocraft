import { IconDeviceTablet, IconPointFilled, IconShoppingBag } from "@tabler/icons-react";
import { Badge } from "@zerocraft/components/ui/badge";
import { Card, CardContent } from "@zerocraft/components/ui/card";

export default function PointOfSaleChannelPage() {
  return (
    <section className="mx-auto w-full max-w-5xl space-y-6 py-2">
      <header>
        <p className="text-sm text-muted-foreground">Sales channels</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Point of Sale</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Manage in-person selling alongside your online store.</p>
      </header>
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-muted"><IconDeviceTablet className="size-7 text-muted-foreground" stroke={1.6} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">ZeroCraft Point of Sale</h2><Badge variant="outline"><IconPointFilled className="size-3 text-amber-500" />Coming soon</Badge></div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Point of Sale setup is not available yet. Products and inventory are ready in your store workspace for a future in-person channel.</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground"><IconShoppingBag className="size-4" />Store channel</div>
        </CardContent>
      </Card>
    </section>
  );
}
