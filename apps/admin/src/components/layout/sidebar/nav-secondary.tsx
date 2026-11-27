
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@zerocraft/ui/sidebar";

type NavSecondaryItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
};

interface NavSecondaryProps
  extends React.ComponentPropsWithoutRef<typeof SidebarGroup> {
  items: NavSecondaryItem[];
}

export function NavSecondary({
  items,
  ...props
}: NavSecondaryProps) {
  const pathname = usePathname();

  const isRouteActive = (url: string) => {
    return pathname === url || pathname.startsWith(`${url}/`);
  };

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = isRouteActive(item.url);

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  render={<Link href={item.url} />}
                  size="sm"
                  className="hover:bg-primary-foreground/10 text-secondary!"
                  isActive={isActive}
                  tooltip={item.title}
                >
                  {Icon && <Icon className="size-4 shrink-0 text-secondary/50!" />}

                  <span className="truncate">{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
