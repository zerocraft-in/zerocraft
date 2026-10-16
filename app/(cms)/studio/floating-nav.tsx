"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";
import {
  IconArrowLeft,
  IconArrowUpRight,
  IconBriefcase,
  IconChartBar,
  IconDatabase,
  IconFileText,
  IconHome,
  IconLogout,
  IconLoader2,
  IconSettings,
  IconShoppingBag,
  IconUsers,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type NavigationChild = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; stroke?: number }>;
};
type NavigationItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; stroke?: number }>;
  children?: NavigationChild[];
};

const navigation: NavigationItem[] = [
  { label: "Dashboard", href: "/studio", icon: IconHome },
  {
    label: "Store",
    href: "/studio/store",
    icon: IconShoppingBag,
    children: [
      { label: "Overview", href: "/studio/store", icon: IconHome },
      {
        label: "Products",
        href: "/studio/store/products",
        icon: IconBriefcase,
      },
      {
        label: "Categories",
        href: "/studio/store/categories",
        icon: IconDatabase,
      },
      {
        label: "Collections",
        href: "/studio/store/collections",
        icon: IconChartBar,
      },
      {
        label: "Customization",
        href: "/studio/store/customization",
        icon: IconSettings,
      },
      {
        label: "Inventory",
        href: "/studio/store/inventory",
        icon: IconDatabase,
      },
      {
        label: "Discounts",
        href: "/studio/store/discounts",
        icon: IconUsers,
      },
      {
        label: "Purchase orders",
        href: "/studio/store/purchase-orders",
        icon: IconFileText,
      },
      {
        label: "Gift cards",
        href: "/studio/store/gift-cards",
        icon: IconBriefcase,
      },
    ],
  },
  {
    label: "Orders",
    href: "/studio/orders",
    icon: IconFileText,
    children: [
      { label: "All Orders", href: "/studio/orders", icon: IconFileText },
      { label: "Drafts", href: "/studio/orders/drafts", icon: IconBriefcase },
      {
        label: "Abandoned checkouts",
        href: "/studio/orders/abandoned-checkouts",
        icon: IconShoppingBag,
      },
      { label: "Pending", href: "/studio/orders/pending", icon: IconChartBar },
      {
        label: "Fulfillment",
        href: "/studio/orders/fulfillment",
        icon: IconDatabase,
      },
      {
        label: "Returns",
        href: "/studio/orders/returns",
        icon: IconArrowUpRight,
      },
    ],
  },
  {
    label: "Clients",
    href: "/studio/clients",
    icon: IconUsers,
    children: [
      { label: "All Clients", href: "/studio/clients", icon: IconUsers },
      {
        label: "Appointments",
        href: "/studio/appointments",
        icon: IconChartBar,
      },
      {
        label: "Inquiries",
        href: "/studio/clients/inquiries",
        icon: IconFileText,
      },
      {
        label: "Projects",
        href: "/studio/clients/projects",
        icon: IconBriefcase,
      },
    ],
  },
  {
    label: "Works",
    href: "/studio/works",
    icon: IconBriefcase,
    children: [
      { label: "All Works", href: "/studio/works", icon: IconBriefcase },
      { label: "Blogs", href: "/studio/blogs", icon: IconFileText },
      { label: "Reviews", href: "/studio/reviews", icon: IconUsers },
      {
        label: "Categories",
        href: "/studio/works/categories",
        icon: IconDatabase,
      },
      {
        label: "Featured Works",
        href: "/studio/works/featured",
        icon: IconChartBar,
      },
    ],
  },
  {
    label: "Reports",
    href: "/studio/reports",
    icon: IconChartBar,
    children: [
      { label: "Overview", href: "/studio/reports", icon: IconChartBar },
      { label: "Sales", href: "/studio/reports/sales", icon: IconShoppingBag },
      {
        label: "Analytics",
        href: "/studio/reports/analytics",
        icon: IconDatabase,
      },
      {
        label: "Automations",
        href: "/studio/automations",
        icon: IconBriefcase,
      },
      { label: "AI studio", href: "/studio/ai", icon: IconUsers },
    ],
  },
  {
    label: "Database",
    href: "/studio/database",
    icon: IconDatabase,
    children: [
      { label: "Overview", href: "/studio/database", icon: IconDatabase },
      {
        label: "Storage",
        href: "/studio/database/storage",
        icon: IconBriefcase,
      },
      {
        label: "Activity Logs",
        href: "/studio/database/logs",
        icon: IconFileText,
      },
    ],
  },
];

type Props = { onLogout: () => Promise<void>; isSigningOut?: boolean };

function isRouteActive(pathname: string, href: string) {
  return (
    pathname === href || (href !== "/studio" && pathname.startsWith(`${href}/`))
  );
}

function getPreviousHref(pathname: string) {
  if (pathname === "/studio") return null;
  const section = navigation.find((item) => isRouteActive(pathname, item.href));
  return !section || pathname === section.href ? "/studio" : section.href;
}

function CrtIcon({
  icon: Icon,
  className,
  active = false,
}: {
  icon: NavigationItem["icon"];
  className: string;
  active?: boolean;
}) {
  return (
    <span className="relative isolate inline-flex items-center justify-center">
      <Icon
        className={cn(
          "pointer-events-none absolute translate-x-[1px] text-cyan-400/70 opacity-0 mix-blend-screen transition-all duration-200 group-hover:opacity-100",
          active && "opacity-70",
          className,
        )}
        stroke={1.7}
      />
      <Icon
        className={cn(
          "pointer-events-none absolute -translate-x-[1px] text-fuchsia-400/70 opacity-0 mix-blend-screen transition-all duration-200 group-hover:opacity-100",
          active && "opacity-70",
          className,
        )}
        stroke={1.7}
      />
      <Icon className={cn("relative z-[1]", className)} stroke={1.7} />
    </span>
  );
}

function RailItem({
  item,
  active,
  pathname,
}: {
  item: NavigationItem;
  active: boolean;
  pathname: string;
}) {
  const Icon = item.icon;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={item.href}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:border-ring",
              active && "bg-secondary text-foreground",
            )}
          />
        }
      >
        <CrtIcon icon={Icon} className="size-5" active={active} />
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

function SectionPanel({
  item,
  pathname,
}: {
  item: NavigationItem;
  pathname: string;
}) {
  return (
    <aside className="absolute left-[calc(100%+10px)] top-1/2 z-50 w-56 max-h-[min(32rem,calc(100dvh-2rem))] -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-2 text-card-foreground shadow-xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <nav
        aria-label={`${item.label} navigation`}
        className="mt-1 grid gap-0.5"
      >
        {item.children?.map((child) => {
          const active = isRouteActive(pathname, child.href);
          return (
            <Link
              key={child.href}
              href={child.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:outline-none",
                active && "bg-secondary text-foreground",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full bg-muted-foreground/40",
                    active && "bg-primary",
                  )}
                />
                <span className="truncate">{child.label}</span>
              </span>
              <IconArrowUpRight className="size-3 shrink-0 opacity-0 transition group-hover:opacity-100" />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function IconNavLink({
  href,
  label,
  icon: Icon,
  active,
  child = false,
}: {
  href: string;
  label: string;
  icon: NavigationItem["icon"];
  active: boolean;
  child?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            data-crt-nav-item
            className={cn(
              "group relative flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              child && "size-9 rounded-lg",
              active && "bg-secondary text-foreground",
            )}
          />
        }
      >
        <CrtIcon
          icon={Icon}
          className={child ? "size-[17px]" : "size-5"}
          active={active}
        />
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function FloatingSidebar() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // Find the active navigation section.
  // Support children with routes outside the parent prefix.
  const activeSection = navigation.find((item) => {
    if (item.href === "/studio") return false;

    return (
      isRouteActive(pathname, item.href) ||
      item.children?.some((child) => isRouteActive(pathname, child.href))
    );
  });

  const showChildren = Boolean(activeSection?.children?.length);

  useLayoutEffect(() => {
    if (!navRef.current) return;

    const context = gsap.context(() => {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const items = gsap.utils.toArray<HTMLElement>("[data-crt-nav-item]");

      if (reducedMotion) {
        gsap.set(items, { clearProps: "all" });
        return;
      }

      gsap.fromTo(
        navRef.current,
        { scale: 0.96, autoAlpha: 0.7 },
        {
          scale: 1,
          autoAlpha: 1,
          duration: 0.45,
          ease: "power3.out",
          overwrite: "auto",
        },
      );
      gsap.fromTo(
        items,
        { y: 8, autoAlpha: 0, filter: "blur(4px)" },
        {
          y: 0,
          autoAlpha: 1,
          filter: "blur(0px)",
          duration: 0.38,
          stagger: 0.035,
          ease: "power3.out",
          overwrite: "auto",
        },
      );
    }, navRef);

    return () => context.revert();
  }, [pathname, showChildren]);

  return (
    <TooltipProvider>
      <div className="relative">
        <nav
          ref={navRef}
          aria-label={
            showChildren
              ? `${activeSection?.label} navigation`
              : "Studio navigation"
          }
          className={cn(
            "relative flex max-h-[calc(100dvh-12rem)]",
            "flex-col items-center gap-1",
            "rounded-2xl border border-border",
            "bg-card p-1.5 font-mono",
          )}
        >
          {showChildren ? (
            <>
              {/* Previous button */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      render={<Link href="/studio" />}
                      nativeButton={false}
                      variant="outline"
                      size="icon"
                      className="group mb-1 size-10 rounded-xl"
                      data-crt-nav-item
                      aria-label="Back to main navigation"
                    />
                  }
                >
                  <IconArrowLeft className="size-5" stroke={1.7} />
                </TooltipTrigger>

                <TooltipContent side="right" sideOffset={12}>
                  Back to main navigation
                </TooltipContent>
              </Tooltip>

              {/* Active section children only */}
              <div
                className={cn(
                  "flex w-full flex-col items-center gap-1",
                  "overflow-y-auto",
                  "[scrollbar-width:none]",
                  "[-ms-overflow-style:none]",
                  "[&::-webkit-scrollbar]:hidden",
                )}
              >
                {activeSection!.children!.map((child) => {
                  const active =
                    pathname === child.href ||
                    (child.href !== activeSection!.href &&
                      isRouteActive(pathname, child.href));

                  return (
                    <IconNavLink
                      key={child.href}
                      href={child.href}
                      label={child.label}
                      icon={child.icon}
                      active={active}
                      child
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* Main navigation icons only */}
              {navigation.map((item) => (
                <IconNavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={
                    item.href === "/studio"
                      ? pathname === "/studio"
                      : isRouteActive(pathname, item.href)
                  }
                />
              ))}
            </>
          )}
        </nav>
      </div>
    </TooltipProvider>
  );
}

export function FloatingLogout({ onLogout, isSigningOut = false }: Props) {
  return (
    <TooltipProvider>
      <div className="flex flex-col items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                render={<Link href="/studio/settings" />}
                nativeButton={false}
                aria-label="Settings"
                variant="outline"
                size="icon-lg"
                className="group size-12 rounded-2xl"
              />
            }
          >
            <CrtIcon icon={IconSettings} className="size-[19px]" />
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            Settings
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                onClick={() => void onLogout()}
                disabled={isSigningOut}
                aria-label="Sign out"
                variant="outline"
                size="icon-lg"
                className="group size-12 rounded-2xl"
              />
            }
          >
            <CrtIcon
              icon={isSigningOut ? IconLoader2 : IconLogout}
              className={cn("size-[19px]", isSigningOut && "animate-spin")}
            />
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            Sign out
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
