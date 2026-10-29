import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export default function QuickCreatePage() {
  return (
    <main className="mx-auto w-full max-w-2xl pb-16">
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workspace action</p>
        <h1 className="mt-2 text-2xl font-semibold">Quick create</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Canonical route for creating projects, clients, appointments, and products.</p>
        <Button className="mt-5" variant="outline" nativeButton={false} render={<Link href="/" />}><IconArrowLeft /> Back to dashboard</Button>
      </div>
    </main>
  );
}
