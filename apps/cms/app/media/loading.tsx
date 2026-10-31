import { Skeleton } from "@/components/ui/skeleton";

export default function MediaLoading() {
  return (
    <main className="mx-auto w-full max-w-screen-2xl space-y-5 pb-12">
      <div className="flex items-end justify-between gap-4 border-b pb-6">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-80 max-w-[70vw]" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="h-44 w-full rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-64 rounded-xl" />
        ))}
      </div>
    </main>
  );
}
