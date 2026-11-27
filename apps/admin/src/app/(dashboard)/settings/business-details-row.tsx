"use client";

import * as React from "react";
import { Ellipsis } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@zerocraft/ui/dropdown-menu";
import { Button } from "@zerocraft/ui/button";
import { AboutYourBusinessDrawer } from "./about-your-business-drawer";
import { Card, CardContent } from "@zerocraft/ui/card";
import Link from "next/link";
import Image from "next/image";

type BusinessDetailsRowProps = {
  org: {
    id: string;
    name: string | null;
    country: string | null;
    email: string | null;
    phone: string | null;
    address: Record<string, unknown> | null;
  };
};

export function BusinessDetailsRow({ org }: BusinessDetailsRowProps) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const router = useRouter();

  return (
    <div className="space-y-2">
      <Card className="overflow-hidden">
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex shrink-0 items-center justify-center size-10 w-10 h-5 rounded-md">
              <Image
                fill
                src="https://flagcdn.com/w40/in.png"
                alt="India flag"
                className="object-contain"
              />
            </div>
            <div className="min-w-0 flex flex-col leading-none">
              <span className="font-medium text-foreground">
                {org.name ?? "Maran R"}
              </span>
              <span className="text-xs text-muted-foreground">
                {org.country ?? "India"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={({ ...triggerProps }) => (
                  <Button
                    {...triggerProps}
                    variant="outline"
                    size="icon-sm"
                    aria-label="More options"
                  >
                    <Ellipsis className="size-4" />
                  </Button>
                )}
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDrawerOpen(true)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setDrawerOpen(false);
                    router.push("/settings/organization-details");
                  }}
                >
                  Add entity
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <AboutYourBusinessDrawer
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
              org={org}
            />
          </div>
        </CardContent>
      </Card>
      <p className="text-sm text-foreground">
        Manage entities in{" "}
        <Link
          className="text-primary underline underline-offset-2"
          href="/settings/organization-details"
        >
          Organization settings
        </Link>
      </p>
    </div>
  );
}
