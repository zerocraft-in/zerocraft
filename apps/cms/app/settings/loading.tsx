import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <main className="mx-auto w-full max-w-[1240px] pb-16" aria-busy="true" aria-label="Loading settings">
      <div className="mb-5 flex items-center justify-between border-b border-border/70 pb-4">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid items-start gap-7 lg:grid-cols-[224px_minmax(0,780px)]">
        <Card className="border-border/80 bg-card shadow-none">
          <CardHeader className="space-y-2 border-b border-border/70 pb-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-28" />
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            {Array.from({ length: 12 }).map((_, index) => <Skeleton key={index} className="h-8 w-full" />)}
          </CardContent>
        </Card>
        <div className="space-y-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <section key={index} className="space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-72" />
              <Card className="border-border/80 bg-card shadow-none"><CardContent className="space-y-4 p-5"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></CardContent></Card>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
