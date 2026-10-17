"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import {
  IconArrowUpRight,
  IconBell,
  IconBolt,
  IconBriefcase,
  IconCalendar,
  IconChartBar,
  IconDatabase,
  IconFileText,
  IconHome,
  IconLogout,
  IconMenu2,
  IconMoon,
  IconSearch,
  IconSettings,
  IconShoppingBag,
  IconSparkles,
  IconStar,
  IconSun,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { StudioMotion } from "@/components/studio/studio-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  supabase,
  type StudioNotification,
  fetchNotificationsFromSupabase,
  markAllNotificationsAsReadInSupabase,
  markNotificationAsReadInSupabase,
} from "@/lib/supabase-client";
import { FloatingLogout, FloatingSidebar } from "./floating-nav";
import { ADMIN_ROUTES } from "@/lib/admin-routes";

const primaryNavigation = [
  { label: "Dashboard", href: ADMIN_ROUTES.overview, icon: IconHome },
  { label: "Studio", href: ADMIN_ROUTES.studio.works, icon: IconBriefcase },
  { label: "Store", href: ADMIN_ROUTES.store.overview, icon: IconShoppingBag },
  { label: "Orders", href: ADMIN_ROUTES.operations.orders, icon: IconFileText },
  { label: "Reports", href: ADMIN_ROUTES.operations.reports, icon: IconChartBar },
  { label: "System", href: ADMIN_ROUTES.system.database, icon: IconDatabase },
];

function isPrimaryNavigationActive(pathname: string, href: string) {
  return (
    pathname === href || (href !== "/studio" && pathname.startsWith(`${href}/`))
  );
}

type StudioNavigationLink = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; stroke?: number }>;
};

type StudioNavigationGroup = {
  label: string;
  links: StudioNavigationLink[];
};

const groups: StudioNavigationGroup[] = [
  {
    label: "Overview",
    links: [{ label: "Dashboard", href: ADMIN_ROUTES.overview, icon: IconHome }],
  },
  {
    label: "Studio",
    links: [
      { label: "Works", href: ADMIN_ROUTES.studio.works, icon: IconBriefcase },
      { label: "Clients", href: ADMIN_ROUTES.studio.clients, icon: IconUsers },
      { label: "Appointments", href: ADMIN_ROUTES.studio.appointments, icon: IconCalendar },
      { label: "Blogs", href: ADMIN_ROUTES.studio.blogs, icon: IconFileText },
      { label: "Reviews", href: ADMIN_ROUTES.studio.reviews, icon: IconStar },
    ],
  },
  {
    label: "Store",
    links: [
      { label: "Store Overview", href: ADMIN_ROUTES.store.overview, icon: IconChartBar },
      { label: "Products", href: ADMIN_ROUTES.store.products, icon: IconShoppingBag },
      { label: "Categories", href: ADMIN_ROUTES.store.categories, icon: IconDatabase },
      { label: "Collections", href: ADMIN_ROUTES.store.collections, icon: IconShoppingBag },
      { label: "Inventory", href: ADMIN_ROUTES.store.inventory, icon: IconDatabase },
      { label: "Customization", href: ADMIN_ROUTES.store.customization, icon: IconSettings },
      { label: "Discounts", href: ADMIN_ROUTES.store.discounts, icon: IconUsers },
      { label: "Gift Cards", href: ADMIN_ROUTES.store.giftCards, icon: IconShoppingBag },
      { label: "Purchase Orders", href: ADMIN_ROUTES.store.purchaseOrders, icon: IconFileText },
      { label: "Transfers", href: ADMIN_ROUTES.store.transfers, icon: IconFileText },
    ],
  },
  {
    label: "Operations",
    links: [
      { label: "Orders", href: ADMIN_ROUTES.operations.orders, icon: IconFileText },
      { label: "Reports", href: ADMIN_ROUTES.operations.reports, icon: IconChartBar },
    ],
  },
  {
    label: "System",
    links: [
      { label: "Database", href: ADMIN_ROUTES.system.database, icon: IconDatabase },
      { label: "Staff", href: ADMIN_ROUTES.system.staff, icon: IconUsers },
      { label: "AI", href: ADMIN_ROUTES.system.ai, icon: IconSparkles },
      { label: "Automations", href: ADMIN_ROUTES.system.automations, icon: IconBolt },
      { label: "Integrations", href: ADMIN_ROUTES.system.integrations, icon: IconSettings },
      { label: "Settings", href: ADMIN_ROUTES.system.settings, icon: IconSettings },
    ],
  },
];
const allLinks = groups.flatMap((group) => group.links);

function StudioMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`${className} fill-current`}
    >
      <path d="M5.16.43c4.97,7.25,9.93,8.51,14.9,3.78,1.09,1.24,1.94,2.48,2.53,3.71-2.41,3.97-7.69,4.08-11.59,6.41,4.15-.64,8.18-.19,12.08,1.37-.44,1.21-1.13,2.42-2.07,3.63-5.6-5.34-11.2-3.92-16.8,4.26-1.48-1.89-2.57-3.78-3.3-5.67,2.87-6.36,8.78-7.1,12.63-8.59-3.92-.16-7.97-1.26-12.14-3.32.88-1.86,2.13-3.72,3.76-5.58Z" />
    </svg>
  );
}

type Props = {
  children: React.ReactNode;
  user: { name: string; email: string; role: string };
};

export default function StudioShell({ children, user }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [notices, setNotices] = useState<StudioNotification[]>([]);
  const [isDark, setIsDark] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const mobileMenuTimeline = useRef<gsap.core.Timeline | null>(null);
  const mobileMenuClosing = useRef(false);
  const results = useMemo(
    () =>
      allLinks.filter((item) =>
        item.label.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [query],
  );
  const unread = notices.filter((item) => !item.read).length;

  useEffect(() => {
    const syncTheme = () => {
      const root = document.getElementById("zerocraft-cms");
      setIsDark(
        Boolean(
          root?.classList.contains("dark") ||
          root?.dataset.appearance === "dark" ||
          document.documentElement.classList.contains("dark"),
        ),
      );
    };
    syncTheme();
    window.addEventListener("studio-appearance", syncTheme);
    return () => window.removeEventListener("studio-appearance", syncTheme);
  }, []);

  useLayoutEffect(() => {
    if (!mobileMenuOpen) return;
    const panel = document.querySelector<HTMLElement>(
      "[data-mobile-menu-panel]",
    );
    if (!panel) return;
    const items = panel.querySelectorAll<HTMLElement>(
      "[data-mobile-menu-item]",
    );
    const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
    mobileMenuTimeline.current = timeline;
    timeline
      .fromTo(panel, { xPercent: -100 }, { xPercent: 0, duration: 0.34 })
      .fromTo(
        items,
        { opacity: 0, x: -16 },
        { opacity: 1, x: 0, duration: 0.24, stagger: 0.025 },
        "-=0.16",
      );

    return () => {
      timeline.kill();
      if (mobileMenuTimeline.current === timeline) {
        mobileMenuTimeline.current = null;
      }
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    let current = true;
    const load = async () => {
      try {
        const data = await fetchNotificationsFromSupabase();
        if (current) setNotices(data);
      } catch (error) {
        console.error("Could not load notifications", error);
      }
    };
    void load();
    const channel = supabase.channel?.("studio-notices");
    if (channel) {
      channel.on?.(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => void load(),
      );
      channel.subscribe?.();
    }
    return () => {
      current = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setNoticesOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function toggleTheme() {
    const dark = !isDark;
    const root = document.getElementById("zerocraft-cms");
    setIsDark(dark);
    root?.classList.toggle("dark", dark);
    if (root) {
      root.dataset.appearance = dark ? "dark" : "light";
      root.dataset.theme = dark ? "dark" : "light";
    }
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try {
      localStorage.setItem(
        "zerocraft-studio-appearance",
        JSON.stringify({ mode: dark ? "dark" : "light" }),
      );
    } catch (error) {
      console.error("Could not persist theme", error);
    }
    window.dispatchEvent(new Event("studio-appearance"));
  }

  async function signOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setErrorMessage("");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Sign out failed", error);
      setErrorMessage("Could not sign out. Please try again.");
      setIsSigningOut(false);
    }
  }

  async function readNotice(item: StudioNotification) {
    try {
      await markNotificationAsReadInSupabase(item.id);
      setNotices((current) =>
        current.map((notice) =>
          notice.id === item.id ? { ...notice, read: true } : notice,
        ),
      );
      setNoticesOpen(false);
      if (item.link?.startsWith("/studio")) router.push(item.link);
    } catch (error) {
      console.error("Could not mark notification as read", error);
    }
  }

  function closeMobileMenu() {
    if (!mobileMenuOpen || mobileMenuClosing.current) return;
    const panel = document.querySelector<HTMLElement>(
      "[data-mobile-menu-panel]",
    );
    if (!panel) {
      setMobileMenuOpen(false);
      return;
    }

    mobileMenuClosing.current = true;
    mobileMenuTimeline.current?.kill();
    const items = panel.querySelectorAll<HTMLElement>(
      "[data-mobile-menu-item]",
    );
    mobileMenuTimeline.current = gsap
      .timeline({
        defaults: { ease: "power3.in" },
        onComplete: () => {
          mobileMenuClosing.current = false;
          mobileMenuTimeline.current = null;
          setMobileMenuOpen(false);
        },
      })
      .to(items, { opacity: 0, x: -16, duration: 0.16, stagger: 0.02 })
      .to(panel, { xPercent: -100, duration: 0.28 }, "-=0.04");
  }

  function handleMobileMenuChange(open: boolean) {
    if (open) {
      mobileMenuClosing.current = false;
      setMobileMenuOpen(true);
      return;
    }
    closeMobileMenu();
  }

  return (
    <div className="relative isolate h-dvh w-full overflow-hidden bg-background text-foreground selection:bg-accent selection:text-accent-foreground">
      {/* Craft-inspired canvas: subtle dot grid, fixed behind the workspace */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-background"
      >
        <div
          className="absolute inset-0 opacity-[0.28] dark:opacity-[0.24]"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 0.7px, transparent 0.8px)",
            backgroundSize: "24px 24px",
            backgroundPosition: "12px 12px",
            color: "var(--muted-foreground)",
          }}
        />
      </div>

      {/* header */}
      <header className="fixed inset-x-0 top-0 z-50 grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-6 lg:h-[72px] lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            render={<Link href="/studio" />}
            nativeButton={false}
            variant="outline"
            size="icon"
            className="size-11 rounded-xl"
            aria-label="Zerocraft Studio dashboard"
          >
            <StudioMark className="size-4.5" />
          </Button>
        </div>
        <nav
          aria-label="Primary studio navigation"
          className="hidden min-w-0 max-w-full items-center justify-self-center gap-1 overflow-x-auto px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden xl:flex"
        >
          {primaryNavigation.map(({ label, href, icon: Icon }) => {
            const active = isPrimaryNavigationActive(pathname, href);
            return (
              <Button
                key={href}
                render={<Link href={href} />}
                nativeButton={false}
                variant={active ? "secondary" : "ghost"}
                size="default"
                className="shrink-0 gap-2.5 rounded-lg px-3.5 h-9 font-mono text-sm tracking-[0.02em]"
                aria-current={active ? "page" : undefined}
              >
                {label}
              </Button>
            );
          })}
        </nav>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-10 rounded-xl"
            onClick={() => setSearchOpen(true)}
            aria-label="Search pages"
          >
            <IconSearch className="size-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="relative size-10 rounded-xl"
            onClick={() => setNoticesOpen((open) => !open)}
            aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
            aria-expanded={noticesOpen}
          >
            <IconBell className="size-5" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 size-2 rounded-full bg-blue-500" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-10 rounded-xl"
                aria-label="Account menu"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs rounded-lg">
                    {user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <div className="px-2 py-2">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {user.role}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/studio/settings" />}>
                <IconSettings className="mr-2 size-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleTheme}>
                {isDark ? (
                  <IconSun className="mr-2 size-4" />
                ) : (
                  <IconMoon className="mr-2 size-4" />
                )}
                {isDark ? "Light mode" : "Dark mode"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={isSigningOut}
                onClick={() => void signOut()}
                className="text-destructive"
              >
                <IconLogout className="mr-2 size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="icon"
            className="size-10 rounded-xl xl:hidden"
            onClick={() => handleMobileMenuChange(!mobileMenuOpen)}
            aria-label="Toggle mobile navigation"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <IconX className="size-5" />
            ) : (
              <IconMenu2 className="size-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Primary desktop navigation rail */}
      <div className="fixed bottom-24 left-3 top-[72px] z-40 hidden w-[72px] flex-col items-center justify-center lg:flex">
        <FloatingSidebar />
      </div>

      {/* Main content */}
      <div className="absolute inset-x-0 bottom-0 w-full top-0 min-h-0 overflow-hidden">
        <main
          tabIndex={0}
          aria-label="Studio content"
          data-studio-scroll
          className="
            relative z-10
            h-full w-full min-h-0 min-w-0
            overflow-y-auto pt-[5rem]
            overscroll-y-contain
            outline-none
            [scrollbar-width:none]
            [-ms-overflow-style:none]
            [&::-webkit-scrollbar]:hidden
          "
        >
          <div
            data-studio-content
            className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col px-4 py-25"
          >
            <StudioMotion>{children}</StudioMotion>
          </div>
        </main>
        {/* Viewport vignette — visual only; scrolling and clicks remain enabled */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-20 h-36 bg-linear-to-b from-background via-background/75 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-32 bg-linear-to-t from-background via-background/70 to-transparent"
        />
      </div>

      {/* ──────────────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-6 left-3 z-40 hidden w-[72px] items-center justify-center lg:flex">
        <FloatingLogout onLogout={signOut} isSigningOut={isSigningOut} />
      </div>

      {errorMessage && (
        <Alert
          className="fixed bottom-4 right-4 z-[80] w-[min(24rem,calc(100vw-2rem))] border-destructive/30 bg-background shadow-xl"
          variant="destructive"
        >
          <AlertTitle>Sign out failed</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
          <AlertAction>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setErrorMessage("")}
            >
              Dismiss
            </Button>
          </AlertAction>
        </Alert>
      )}

      <Dialog open={noticesOpen} onOpenChange={setNoticesOpen}>
        <DialogContent className="w-[min(24rem,calc(100vw-2rem))] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Notifications
              {unread > 0 && <Badge variant="secondary">{unread} new</Badge>}
            </DialogTitle>
            <DialogDescription>
              Updates and activity from your studio workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end border-b pb-3">
            <Button
              variant="ghost"
              size="sm"
              disabled={!unread}
              onClick={async () => {
                try {
                  await markAllNotificationsAsReadInSupabase();
                  setNotices((items) =>
                    items.map((item) => ({ ...item, read: true })),
                  );
                } catch (error) {
                  console.error(error);
                }
              }}
            >
              Mark all read
            </Button>
          </div>
          <ScrollArea className="h-80 max-h-[40vh]">
            <div className="mt-3 space-y-2 pr-3">
              {notices.length ? (
                notices.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => void readNotice(item)}
                    className="w-full rounded-lg border p-3 text-left hover:bg-muted"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {!item.read && (
                        <span className="size-2 rounded-full bg-primary" />
                      )}
                      {item.title}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {item.message}
                    </span>
                  </button>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  You’re all caught up.
                </p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <CommandDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Search studio pages"
        description="Jump to a page in your studio workspace."
      >
        <Command>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Jump to a studio page..."
          />
          <CommandList className="-mx-4 no-scrollbar max-h-[50vh] overflow-y-auto px-4">
            <CommandEmpty>No matching pages.</CommandEmpty>
            <CommandGroup heading="Navigation">
              {results.map(({ label, href, icon: Icon }) => (
                <CommandItem
                  key={href}
                  value={label}
                  onSelect={() => {
                    router.push(href);
                    setSearchOpen(false);
                    setQuery("");
                  }}
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <span> {label}</span>
                  <IconArrowUpRight className="ml-auto size-4 text-muted-foreground" />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  );
}
