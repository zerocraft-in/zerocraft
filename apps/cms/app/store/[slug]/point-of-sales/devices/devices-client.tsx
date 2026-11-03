"use client";

import Link from "next/link";
import {
  IconArrowLeft,
  IconChevronRight,
  IconDeviceTablet,
  IconDots,
  IconSearch,
} from "@tabler/icons-react";
import { Button } from "@zerocraft/components/ui/button";
import { CommercePageHeader } from "@/components/commerce/commerce-page-header";

export default function DevicesPageClient({ slug }: { slug: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CommercePageHeader
        left={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              nativeButton={false}
              render={<Link href={`/store/${slug}/point-of-sales`} />}
              aria-label="Back to Point of Sale"
            >
              <IconArrowLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <span className="grid size-6 place-items-center rounded bg-emerald-600 text-white">
                <IconDeviceTablet className="size-3.5" />
              </span>
              <span className="text-muted-foreground">/</span>
              <span>Devices</span>
            </div>
          </div>
        }
        actions={
          <Button variant="outline" size="icon" aria-label="More options">
            <IconDots className="size-4" />
          </Button>
        }
      />

      <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <div className="relative mb-6 flex items-center justify-center">
          {/* Mockup matching the card terminal & tablet in the reference image */}
          <div className="relative flex items-center gap-3">
            <div className="flex h-28 w-16 flex-col items-center justify-between rounded-xl border-2 border-border/80 bg-zinc-900 p-2 text-zinc-400 shadow-md">
              <span className="text-[8px] font-semibold tracking-wider text-zinc-300">POS</span>
              <div className="grid grid-cols-3 gap-1 py-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <span key={i} className="size-1.5 rounded-full bg-zinc-600" />
                ))}
              </div>
              <span className="h-1 w-6 rounded-full bg-zinc-700" />
            </div>

            <div className="flex h-36 w-48 flex-col items-center justify-center rounded-2xl border-4 border-zinc-900 bg-zinc-950 p-3 shadow-xl">
              <span className="text-xs font-bold tracking-widest text-zinc-400">POS</span>
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span key={i} className="size-2 rounded-full bg-zinc-700" />
                ))}
              </div>
            </div>
          </div>
        </div>

        <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
          Manage POS devices
        </h1>
        <p className="mt-1.5 max-w-md text-xs text-muted-foreground sm:text-sm">
          Devices appear here when they’re registered to your store and running POS app.
        </p>
      </main>
    </div>
  );
}

