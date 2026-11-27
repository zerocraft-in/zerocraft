"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IconArrowLeft,
  IconChevronRight,
  IconDeviceTablet,
  IconDots,
  IconLanguage,
  IconMapPin,
  IconNotes,
  IconPrinter,
  IconReceipt2,
  IconScreenShare,
  IconUsers,
} from "@tabler/icons-react";
import { Button } from "@zerocraft/components/ui/button";
import { Card, CardContent } from "@zerocraft/components/ui/card";
import { Switch } from "@zerocraft/components/ui/switch";
import { CommercePageHeader } from "@/components/commerce/commerce-page-header";

export default function PosSettingsPageClient({ slug }: { slug: string }) {
  const [allowRefundsToCredit, setAllowRefundsToCredit] = useState(false);
  const [requireReturnReasons, setRequireReturnReasons] = useState(false);

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
              <span>Settings</span>
            </div>
          </div>
        }
        actions={
          <Button variant="outline" size="icon" aria-label="More options">
            <IconDots className="size-4" />
          </Button>
        }
      />

      <main className="mx-auto w-full max-w-[640px] space-y-6 px-4 py-8 sm:px-6">
        {/* Section 1: General */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">General</h2>
          <Card className="divide-y divide-border/60 overflow-hidden border-border/80 shadow-none">
            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <IconUsers className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Retail staff</span>
              </div>
              <Button
                variant="outline"
                size="xs"
                nativeButton={false}
                render={<Link href={`/store/${slug}/settings/users`} />}
              >
                Manage
              </Button>
            </div>

            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <IconMapPin className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Locations</span>
              </div>
              <Button
                variant="outline"
                size="xs"
                nativeButton={false}
                render={<Link href={`/store/${slug}/settings/locations`} />}
              >
                Manage
              </Button>
            </div>

            <button
              type="button"
              className="flex w-full items-center justify-between p-3.5 text-left transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                <IconLanguage className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Language</span>
              </div>
              <IconChevronRight className="size-4 text-muted-foreground" />
            </button>

            <button
              type="button"
              className="flex w-full items-center justify-between p-3.5 text-left transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                <IconNotes className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Activity log</span>
              </div>
              <IconChevronRight className="size-4 text-muted-foreground" />
            </button>
          </Card>
        </div>

        {/* Section 2: Customization */}
        <div className="space-y-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Customization</h2>
            <p className="text-xs text-muted-foreground">Manage your in-store POS from the POS editor</p>
          </div>
          <Card className="divide-y divide-border/60 overflow-hidden border-border/80 shadow-none">
            <button
              type="button"
              className="flex w-full items-center justify-between p-3.5 text-left transition-colors hover:bg-muted/40"
            >
              <div className="flex items-start gap-3">
                <IconDeviceTablet className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">POS app</p>
                  <p className="text-xs text-muted-foreground">Smart grid, lock screen, checkout, and apps</p>
                </div>
              </div>
              <IconChevronRight className="size-4 text-muted-foreground" />
            </button>

            <button
              type="button"
              className="flex w-full items-center justify-between p-3.5 text-left transition-colors hover:bg-muted/40"
            >
              <div className="flex items-start gap-3">
                <IconScreenShare className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Customer display</p>
                  <p className="text-xs text-muted-foreground">Idle screen, digital receipts, and thank you screen</p>
                </div>
              </div>
              <IconChevronRight className="size-4 text-muted-foreground" />
            </button>

            <button
              type="button"
              className="flex w-full items-center justify-between p-3.5 text-left transition-colors hover:bg-muted/40"
            >
              <div className="flex items-start gap-3">
                <IconPrinter className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Printed receipts</p>
                  <p className="text-xs text-muted-foreground">Receipt layout and content</p>
                </div>
              </div>
              <IconChevronRight className="size-4 text-muted-foreground" />
            </button>
          </Card>
        </div>

        {/* Section 3: Register */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Register</h2>
          <Card className="divide-y divide-border/60 overflow-hidden border-border/80 shadow-none">
            <Link
              href={`/store/${slug}/point-of-sales/register-sessions`}
              className="flex w-full items-center justify-between p-3.5 text-left transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                <IconReceipt2 className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Cash management</span>
              </div>
              <IconChevronRight className="size-4 text-muted-foreground" />
            </Link>

            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <IconReceipt2 className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Recent carts</span>
              </div>
              <span className="text-xs text-muted-foreground">Deletes after 24 hours</span>
            </div>
          </Card>
        </div>

        {/* Section 4: Returns */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Returns</h2>
          <Card className="divide-y divide-border/60 overflow-hidden border-border/80 shadow-none">
            <div className="flex items-center justify-between p-3.5">
              <div>
                <p className="text-sm font-medium">Policy</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Off</span>
                <Button variant="outline" size="xs">
                  Manage
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5">
              <span className="text-sm font-medium">Allow orders to be refunded to store credit</span>
              <Switch
                checked={allowRefundsToCredit}
                onCheckedChange={setAllowRefundsToCredit}
                aria-label="Allow orders to be refunded to store credit"
              />
            </div>

            <div className="flex items-center justify-between p-3.5">
              <span className="text-sm font-medium">Require return reasons</span>
              <Switch
                checked={requireReturnReasons}
                onCheckedChange={setRequireReturnReasons}
                aria-label="Require return reasons"
              />
            </div>
          </Card>
        </div>

        <div className="pt-4 text-center">
          <a
            href="#"
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Learn more about Zerocraft POS
          </a>
        </div>
      </main>
    </div>
  );
}

