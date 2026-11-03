"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IconArrowLeft,
  IconCalendar,
  IconChevronDown,
  IconDeviceTablet,
  IconDots,
  IconMapPin,
  IconSearch,
} from "@tabler/icons-react";
import { Button } from "@zerocraft/components/ui/button";
import { CommercePageHeader } from "@/components/commerce/commerce-page-header";
import { useCurrency } from "@/lib/currency-context";

type FilterTab = "all" | "open" | "closed";

export default function RegisterSessionsPageClient({ slug }: { slug: string }) {
  const { activeConfig } = useCurrency();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

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
              <span>Register sessions</span>
            </div>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Export
            </Button>
            <Button variant="outline" size="icon" aria-label="More options">
              <IconDots className="size-4" />
            </Button>
          </div>
        }
      />

      {/* Filter bar — plain background, no card tint */}
      <div className="border-b px-4 py-2.5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="xs"
            className="h-7 gap-1.5 rounded-full text-xs font-normal"
          >
            <IconCalendar className="size-3.5 text-muted-foreground" />
            Today
          </Button>
          <Button
            variant="outline"
            size="xs"
            className="h-7 gap-1.5 rounded-full text-xs font-normal"
          >
            <IconMapPin className="size-3.5 text-muted-foreground" />
            All locations
            <IconChevronDown className="size-3 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Stats row — plain background, no card tint */}
      <div className="border-b px-4 py-3 sm:px-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <p className="text-xs text-muted-foreground">Sessions opened</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">0</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sessions closed</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">0</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cash at open</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">
              {activeConfig.symbol}0.00
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cash activity</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">
              {activeConfig.symbol}0.00
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cash at close</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">
              {activeConfig.symbol}0.00
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Discrepancies</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">
              {activeConfig.symbol}0.00
            </p>
          </div>
        </div>
      </div>

      {/* Tab bar — underline style active tab, flush border-b */}
      <div className="border-b px-4 sm:px-6">
        <div className="flex items-center gap-0">
          {(["all", "open", "closed"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`-mb-px px-3 py-2.5 text-xs font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      <main className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
          <IconSearch className="size-14 stroke-[1] text-muted-foreground/50" />
          <h2 className="mt-4 text-base font-medium">No sessions found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Try changing the filters or date range
          </p>
        </div>

        {/* Footer link — bottom of page */}
        <div className="border-t px-4 py-4 text-center sm:px-6">
          <a
            href="#"
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Learn more about cash tracking
          </a>
        </div>
      </main>
    </div>
  );
}
