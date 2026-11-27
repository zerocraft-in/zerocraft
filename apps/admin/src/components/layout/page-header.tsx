"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, Package, Settings2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@zerocraft/ui/tooltip";
import { cn } from "@/lib/utils";

const PageHeaderScrollContainerContext =
  React.createContext<React.RefObject<HTMLDivElement | null> | null>(null);

export function PageHeaderScrollContainerProvider({
  children,
  scrollContainerRef,
}: {
  children: React.ReactNode;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <PageHeaderScrollContainerContext.Provider value={scrollContainerRef}>
      {children}
    </PageHeaderScrollContainerContext.Provider>
  );
}

type PageHeaderConfig = {
  parentLabel: string;
  parentHref: string;
  title: string;
  icon: LucideIcon;
  showBack: boolean;
};

function humanize(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getConfig(pathname: string): PageHeaderConfig | null {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const root = segments[0];
  const parentLabel = humanize(root);
  const parentHref = `/${root}`;
  const icon = root === "settings" ? Settings2 : Package;
  const isNested = segments.length > 1;

  const title =
    pathname === "/products/new"
      ? "Add product"
      : isNested
        ? humanize(segments[segments.length - 1])
        : parentLabel;

  return {
    parentLabel,
    parentHref,
    title,
    icon,
    showBack: isNested,
  };
}

/** Reusable route-level layout for pages that need the Shopify-style header. */
export function PageHeader({
  title,
  breadcrumb,
  actions,
  children,
  className,
  scrollContainerRef,
}: {
  title?: string;
  breadcrumb?: {
    title: string;
    url: string;
  };
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const contextScrollContainerRef = React.useContext(
    PageHeaderScrollContainerContext,
  );

  const activeScrollContainerRef =
    scrollContainerRef ?? contextScrollContainerRef;

  const config = React.useMemo(() => getConfig(pathname), [pathname]);

  const PageIcon = config?.icon ?? Package;
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const scrollContainer = activeScrollContainerRef?.current;

    if (!scrollContainer) {
      setIsScrolled(false);
      return;
    }

    const sync = () => {
      setIsScrolled(scrollContainer.scrollTop > 24);
    };

    sync();

    scrollContainer.addEventListener("scroll", sync, {
      passive: true,
    });

    return () => {
      scrollContainer.removeEventListener("scroll", sync);
    };
  }, [activeScrollContainerRef, pathname]);

  React.useEffect(() => {
    activeScrollContainerRef?.current?.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, [pathname, activeScrollContainerRef]);

  if (!config) {
    return <>{children}</>;
  }

  const headerTitle = title ?? breadcrumb?.title ?? config.title;

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-10 flex h-12 items-center overflow-hidden border-border bg-primary-foreground px-4",
          isScrolled ? "border-b" : "border-b-0",
          className,
        )}
      >
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {config.showBack && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-body transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Back to ${config.parentLabel}`}
                      onClick={() => router.push(config.parentHref)}
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                  }
                />
                <TooltipContent side="bottom">
                  Back to {config.parentLabel}
                </TooltipContent>
              </Tooltip>
            )}

            <nav
              aria-label="Breadcrumb"
              className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground"
            >
              <PageIcon className="size-4 shrink-0" aria-hidden="true" />

              <Link
                href={breadcrumb?.url ?? config.parentHref}
                className="font-medium text-body transition-colors hover:text-foreground"
              >
                {config.parentLabel}
              </Link>

              {config.showBack && (
                <motion.div
                  initial={false}
                  animate={{
                    opacity: isScrolled ? 1 : 0,
                    y: isScrolled ? 0 : 6,
                  }}
                  transition={{
                    duration: 0.2,
                    ease: "easeOut",
                  }}
                  aria-hidden={!isScrolled}
                  className="flex min-w-0 items-center gap-1.5 px-2"
                >
                  <span aria-hidden="true">/</span>
                  <span className="truncate font-medium text-body">
                    {headerTitle}
                  </span>
                </motion.div>
              )}
            </nav>
          </div>

          {actions}
        </div>
      </header>

      {children}
    </>
  );
}
