"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  LayoutGrid,
  Plus,
  Store,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@zerocraft/ui/sidebar";

type NavSubItem = { title: string; url: string };
type NavItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  section?: string;
  items?: NavSubItem[];
};

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { state } = useSidebar();
  const isActive = React.useCallback(
    (href: string) => {
      const target = new URL(href, "http://localhost");
      if (pathname !== target.pathname && !pathname.startsWith(`${target.pathname}/`)) {
        return false;
      }

      for (const [key, value] of target.searchParams) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    },
    [pathname, searchParams],
  );
  const mainItems = items.filter((item) => !item.section);
  const channelItems = items.filter(
    (item) =>
      item.title === "Online Store" ||
      item.title === "Agentic" ||
      item.title === "Point of Sale",
  );
  const appItems = items.filter((item) => item.title === "Checkout Blocks");
  return (
    <SidebarGroup className="px-0 py-0">
      <SidebarMenu className="gap-0.5">
        {mainItems.map((item) => (
          <NavItemRow
            key={item.title}
            item={item}
            pathname={pathname}
            isActive={isActive}
          />
        ))}
        <SectionBlocks
          label="Sales channels"
          items={channelItems}
          pathname={pathname}
          isActive={isActive}
          collapsedIcon={Store}
          state={state}
        />
        <SectionBlocks
          label="Apps"
          items={appItems}
          pathname={pathname}
          isActive={isActive}
          collapsedIcon={LayoutGrid}
          state={state}
        />
      </SidebarMenu>
    </SidebarGroup>
  );
}

function SectionBlocks({
  label,
  items,
  pathname,
  isActive,
  collapsedIcon: CollapsedIcon,
  state,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  isActive: (href: string) => boolean;
  collapsedIcon: LucideIcon;
  state: "expanded" | "collapsed";
}) {
  if (items.length === 0) return null;

  const sectionActive = items.some((item) => isActive(item.url));
  const href = items[0]?.url ?? "#";
  return (
    <>
      <div
        className="grid grid-rows-[1fr] opacity-100 transition-[grid-template-rows,opacity] duration-200 ease-out group-data-[collapsible=icon]:grid-rows-[0fr] group-data-[collapsible=icon]:opacity-0"
        inert={state === "collapsed"}
      >
        <div className="min-h-0 overflow-hidden">
          <li className="flex h-6 items-center gap-1 px-3 text-[11px] font-[450] text-sidebar-muted">
            <span>{label}</span>
            <ChevronRight className="size-3" />
          </li>
          {items.map((item) => (
            <NavItemRow
              key={item.title}
              item={item}
              pathname={pathname}
              isActive={isActive}
            />
          ))}
        </div>
      </div>
      <div
        className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-200 ease-out group-data-[collapsible=icon]:grid-rows-[1fr] group-data-[collapsible=icon]:opacity-100"
        inert={state === "expanded"}
      >
        <li className="h-px bg-sidebar-border" />
        <div className="min-h-0 overflow-hidden py-2">
          <SidebarMenuItem>
            <Link
              href={href}
              title={label}
              className={cn(
                "flex !h-7 !w-full items-center !overflow-hidden !rounded-lg !px-2+ text-sidebar-foreground group-data-[collapsible=icon]:!h-7 group-data-[collapsible=icon]:!w-full group-data-[collapsible=icon]:!p-2",
                sectionActive && "bg-sidebar-accent font-semibold text-white",
              )}
            >
              <CollapsedIcon className="size-4 shrink-0" />
              {label === "Apps" && <Plus className="-ml-2 size-2.5" />}
            </Link>
          </SidebarMenuItem>
        </div>
      </div>
    </>
  );
}

function NavItemRow({
  item,
  pathname,
  isActive,
}: {
  item: NavItem;
  pathname: string;
  isActive: (href: string) => boolean;
}) {
  const Icon = item.icon;
  const exact = isActive(item.url);
  const childActive =
    !exact && item.items?.some((child) => isActive(child.url));
  const sectionActive = exact || Boolean(childActive);
  const hasChildren = Boolean(item.items?.length);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={
          <Link
            href={item.url}
            aria-current={exact ? "page" : undefined}
          />
        }
        isActive={exact}
        tooltip={item.title}
        className={cn(
          parentButtonClass,
          childActive &&
            "font-semibold text-white group-data-[collapsible=icon]:bg-sidebar-accent",
        )}
      >
        {Icon && (
          <Icon
            className={cn("size-4 shrink-0", childActive && "text-white")}
          />
        )}
        <span className={labelClass}>{item.title}</span>
        {(item.title === "Point of Sale" ||
          item.title === "Checkout Blocks") && (
          <span className="ml-auto size-1 shrink-0 rounded-full bg-sidebar-muted group-data-[collapsible=icon]:hidden" />
        )}
      </SidebarMenuButton>
      {hasChildren && (
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
            sectionActive
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0",
            "group-data-[collapsible=icon]:grid-rows-[0fr] group-data-[collapsible=icon]:opacity-0",
          )}
          inert={!sectionActive}
        >
          <div className="min-h-0 overflow-hidden">
            <SidebarMenuSub className="mx-0 translate-x-0 gap-0.5 border-l-0 px-0 py-0.5">
              <div>
                {item.items?.map((child) => {
                  const active = pathname === child.url;
                  return (
                    <SidebarMenuSubItem key={child.title}>
                      <SidebarMenuSubButton
                        render={
                          <Link
                            href={child.url}
                            aria-current={active && !exact ? "page" : undefined}
                          />
                        }
                        isActive={active}
                        className="h-7 w-full translate-x-0 rounded-lg pl-8 pr-2 text-[13px] font-[450] text-[#b0b0b0] hover:bg-sidebar-hover data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-white"
                      >
                        <span className="min-w-0 truncate whitespace-nowrap">
                          {child.title}
                        </span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </div>
            </SidebarMenuSub>
          </div>
        </div>
      )}
    </SidebarMenuItem>
  );
}

const labelClass =
  "min-w-0 truncate whitespace-nowrap transition-opacity duration-150 group-data-[collapsible=icon]:opacity-0";
const parentButtonClass =
  "!h-7 !w-full !overflow-hidden !rounded-lg !px-2 text-[13px] font-[450] leading-5 text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-white hover:bg-sidebar-hover hover:text-white focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar group-data-[collapsible=icon]:!h-7 group-data-[collapsible=icon]:!w-full group-data-[collapsible=icon]:!p-2 [&>svg]:size-4 [&>svg]:shrink-0";
