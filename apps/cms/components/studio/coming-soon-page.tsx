import { IconClock, IconRoute, IconSparkles } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ComingSoonPageProps = {
  area: string;
  title: string;
  description: string;
  plannedFeatures: string[];
};

export function ComingSoonPage({ area, title, description, plannedFeatures }: ComingSoonPageProps) {
  return <main className="mx-auto w-full max-w-4xl space-y-6 pb-12">
    <header className="border-b border-border pb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{area}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <Badge variant="outline" className="gap-1.5"><IconClock className="size-3.5" />Coming soon</Badge>
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
    </header>
    <Card className="border-border shadow-none">
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><IconRoute className="size-5 text-muted-foreground" />This workspace is not connected yet</CardTitle></CardHeader>
      <CardContent className="space-y-5 text-sm text-muted-foreground">
        <p>This area is intentionally hidden from the active CMS workflow until its backend data model, permissions, and audit events are ready. No placeholder metrics or fake actions are shown.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {plannedFeatures.map((feature) => <div key={feature} className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3"><IconSparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><span>{feature}</span></div>)}
        </div>
      </CardContent>
    </Card>
  </main>;
}
