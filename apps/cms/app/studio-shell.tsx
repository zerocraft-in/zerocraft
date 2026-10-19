"use client";

import { type CSSProperties, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import {
  IconArrowUpRight,
  IconBell,
  IconBriefcase,
  IconCalendar,
  IconFileText,
  IconLogout,
  IconMenu2,
  IconPlus,
  IconSearch,
  IconSettings,
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
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarProvider } from "@/components/ui/sidebar";
import { StudioSidebar } from "@/components/layout/studio-sidebar";
import { StudioHeader } from "@/components/layout/studio-header";
import {
  supabase,
  type StudioNotification,
  fetchNotificationsFromSupabase,
  markAllNotificationsAsReadInSupabase,
  markNotificationAsReadInSupabase,
} from "@/lib/supabase-client";
import {
  ADMIN_NAVIGATION,
  ADMIN_NAVIGATION_LINKS,
  getAdminBreadcrumbs,
  isAdminNavigationGroupActive,
  isAdminRouteActive,
} from "@/lib/admin-navigation";
const quickActions = [
  { label: "New work", href: "/works?create=1", icon: IconBriefcase },
  { label: "New article", href: "/blogs?create=1", icon: IconFileText },
  {
    label: "New appointment",
    href: "/appointments?create=1",
    icon: IconCalendar,
  },
];

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
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const mobileMenuTimeline = useRef<gsap.core.Timeline | null>(null);
  const mobileMenuClosing = useRef(false);
  const results = useMemo(
    () =>
      ADMIN_NAVIGATION_LINKS.filter((item) =>
        item.label.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [query],
  );
  const actionResults = useMemo(
    () =>
      quickActions.filter((item) =>
        item.label.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [query],
  );
  const unread = notices.filter((item) => !item.read).length;
  const breadcrumbs = getAdminBreadcrumbs(pathname);
  const pageTitle = pathname === "/products/new"
    ? "Add product"
    : pathname.startsWith("/products/")
      ? "Edit product"
      : breadcrumbs.at(-1)?.label || "Dashboard";

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
      if (item.link?.startsWith("/")) router.push(item.link);
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
    <SidebarProvider
      open={!sidebarCollapsed}
      onOpenChange={(open) => setSidebarCollapsed(!open)}
      style={{ "--sidebar-width": "17rem", "--sidebar-width-icon": "4.5rem" } as CSSProperties}
    >
    <div className="relative isolate h-dvh w-full overflow-hidden bg-[#f1f1f1] text-foreground selection:bg-primary/20 dark:bg-background">
      <StudioHeader
        title={pageTitle}
        sidebarCollapsed={sidebarCollapsed}
        unread={unread}
        noticesOpen={noticesOpen}
        isSigningOut={isSigningOut}
        user={user}
        onOpenMobileMenu={() => handleMobileMenuChange(true)}
        onOpenSearch={() => setSearchOpen(true)}
        onToggleNotices={() => setNoticesOpen((open) => !open)}
        onSignOut={() => void signOut()}
      />

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            aria-label="Close navigation"
            onClick={closeMobileMenu}
          />
          <aside
            data-mobile-menu-panel
            aria-label="Studio navigation"
            className="absolute inset-y-0 left-0 w-[min(18rem,88vw)] overflow-y-auto bg-[#151515] p-3 pt-16 text-zinc-300 shadow-2xl"
          >
            <button type="button" onClick={closeMobileMenu} className="absolute right-3 top-3 grid size-8 place-items-center rounded-md bg-white/10" aria-label="Close navigation"><IconX className="size-4" /></button>
            <nav className="space-y-0.5">
              {ADMIN_NAVIGATION.map((group) => {
                const groupActive = isAdminNavigationGroupActive(pathname, group);
                const childLinks = group.links.filter((link) => link.href !== group.href);
                const GroupIcon = group.icon;

                return (
                  <div key={group.label} data-mobile-menu-item>
                    <Link href={group.href} onClick={closeMobileMenu} className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${pathname === group.href ? "bg-[#303030] font-medium text-white" : groupActive ? "font-medium text-white" : "text-zinc-400 hover:bg-white/8 hover:text-white"}`}>
                      <GroupIcon className="size-[18px]" stroke={1.7} />
                      {group.label}
                    </Link>
                    {groupActive && childLinks.length > 0 && (
                      <div className="mb-1 mt-0.5 space-y-0.5 py-0.5">
                        {childLinks.map(({ label, href }) => {
                          const childActive = isAdminRouteActive(pathname, href);
                          return (
                            <Link key={href} href={href} onClick={closeMobileMenu} aria-current={childActive ? "page" : undefined} className={`flex min-h-8 items-center rounded-lg py-1 pl-9 pr-2.5 text-[13px] transition-colors ${childActive ? "bg-[#303030] font-medium text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]" : "text-zinc-500 hover:bg-white/7 hover:text-zinc-200"}`}>
                              {label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      <StudioSidebar
        pathname={pathname}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        onSearch={() => setSearchOpen(true)}
      />

      {/* Main content */}
      <div className={`absolute inset-y-0 right-0 min-h-0 overflow-hidden pt-16 transition-[left] duration-200 ${sidebarCollapsed ? "lg:left-[72px]" : "lg:left-[272px]"}`}>
        <div
          role="main"
          tabIndex={0}
          aria-label="Studio content"
          data-studio-scroll
          className="
            relative z-10
            h-full w-full min-h-0 min-w-0
            overflow-y-auto
            overscroll-y-contain
            outline-none
            [scrollbar-width:none]
            [-ms-overflow-style:none]
            [&::-webkit-scrollbar]:hidden
          "
        >
          <div
            data-studio-content
            className="mx-auto flex min-h-full w-full max-w-[1680px] flex-col p-4 sm:p-6 lg:p-8"
          >
            {breadcrumbs.length > 1 && (
              <nav
                aria-label="Breadcrumb"
                className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                {breadcrumbs.map((item, index) => (
                  <span key={item.href} className="flex items-center gap-2">
                    {index > 0 && <span aria-hidden="true">/</span>}
                    <Link
                      href={item.href}
                      aria-current={
                        index === breadcrumbs.length - 1 ? "page" : undefined
                      }
                      className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {item.label}
                    </Link>
                  </span>
                ))}
              </nav>
            )}
            <StudioMotion>{children}</StudioMotion>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────── */}
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
            {actionResults.length > 0 && (
              <CommandGroup heading="Create" className="mb-2 space-y-4 flex">
                {actionResults.map(({ label, href, icon: Icon }) => (
                  <CommandItem
                    key={href}
                    value={`create ${label}`}
                    onSelect={() => {
                      router.push(href);
                      setSearchOpen(false);
                      setQuery("");
                    }}
                    className="py-2"
                  >
                    <IconPlus className="size-4 text-primary" />
                    <span>{label}</span>
                    <Icon className="ml-auto size-4 text-muted-foreground" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandGroup
              heading="Navigation"
              className="mb-2 space-y-4 gap-2 flex flex-col"
            >
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
                  <span>{label}</span>
                  <IconArrowUpRight className="ml-auto size-4 text-muted-foreground" />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
    </SidebarProvider>
  );
}
