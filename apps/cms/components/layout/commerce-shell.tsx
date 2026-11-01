"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient as createPlatformClient } from "@/lib/platform/auth-client";
import {
  IconArrowUpRight,
  IconShoppingBag,
  IconCalendar,
  IconFileText,
  IconHelpCircle,
  IconLogout,
  IconMaximize,
  IconMicrophone,
  IconMinimize,
  IconPaperclip,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconSparkles,
  IconLayoutSidebarRight,
} from "@tabler/icons-react";
import { Badge } from "@zerocraft/components/ui/badge";
import { Button } from "@zerocraft/components/ui/button";
import { Avatar, AvatarFallback } from "@zerocraft/components/ui/avatar";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@zerocraft/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@zerocraft/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@zerocraft/components/ui/dropdown-menu";
import { ScrollArea } from "@zerocraft/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@zerocraft/components/ui/sheet";
import {
  SidebarInset,
  SidebarProvider,
} from "@zerocraft/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@zerocraft/components/ui/breadcrumb";
import { CmsSidebar } from "@/components/layout/cms-sidebar";
import { SettingsSidebar } from "@/components/navigations/settings-sidebar";
import { supabase } from "@/lib/supabase-client";
import {
  getAdminBreadcrumbs,
  isAdminNavigationGroupActive,
  isAdminRouteActive,
} from "@/lib/admin-navigation";
import { useCommerceAccess } from "@/hooks/use-commerce-access";
import { useCommerceNotifications } from "@/hooks/use-commerce-notifications";
import { useCommerceCommandSearch } from "@/hooks/use-commerce-command-search";
import { useCommerceSidekick } from "@/hooks/use-commerce-sidekick";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { CmsShell } from "@/components/layout/cms-shell";
import { SidekickLauncher } from "@/components/layout/sidekick-launcher";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@zerocraft/components/ui/input-group";
import { cn } from "@/lib/utils";
import { scopedPath, unscopedPath } from "@/lib/platform/scope";
const quickActions = [
  { label: "New product", href: "/store/products/new", icon: IconShoppingBag },
  { label: "Blog posts", href: "/store/content/articles", icon: IconFileText },
  { label: "Orders", href: "/store/orders", icon: IconFileText },
];

type Props = {
  children: React.ReactNode;
  user: { name: string; email: string; role: string };
};

export default function CommerceShell({ children, user }: Props) {
  const pathname = usePathname();
  const routePath = unscopedPath(pathname);
  const router = useRouter();
  const {
    commandPrompt,
    setCommandPrompt,
    bottomPrompt,
    setBottomPrompt,
    sidekickOpen,
    setSidekickOpen,
    sidekickExpanded,
    setSidekickExpanded,
    voiceStatus,
    attachedFiles,
    setAttachedFiles,
    fileInputRef,
    sendBottomPrompt,
    startVoiceCommand,
  } = useCommerceSidekick();
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [collapsedTriggerSuppressed, setCollapsedTriggerSuppressed] =
    useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { features, navigation } = useCommerceAccess(user.role);
  const workspaceNavigation = useMemo(() => navigation, [navigation]);
  const navigationLinks = useMemo(
    () => workspaceNavigation.flatMap((group) => group.links),
    [workspaceNavigation],
  );
  const {
    searchOpen,
    setSearchOpen,
    query,
    setQuery,
    activeSearchIndex,
    setActiveSearchIndex,
    searchResults,
    openSearch,
    goToSearchResult,
    handleSearchKeyDown,
  } = useCommerceCommandSearch(navigationLinks, quickActions);
  const {
    notices,
    noticesLoading,
    notificationsRealtime,
    loadNotifications,
    readNotice,
    markAllNoticesRead,
    clearReadNotices,
  } = useCommerceNotifications((href) => router.push(href));
  const unread = notices.filter((item) => !item.read).length;
  const latestNotices = notices.slice(0, 6);
  const breadcrumbs = getAdminBreadcrumbs(routePath);
  const isContentWorkspace = routePath.startsWith("/store/content");
  const isLiveView = routePath === "/analytics/live-view";
  const isSettingsRoute =
    routePath === "/settings" || routePath.startsWith("/settings/");
  const isUsersSettingsRoute = routePath.startsWith("/settings/users");
  const effectiveSidebarOpen = isSettingsRoute ? false : sidebarOpen;

  useEffect(() => {
    // Settings uses the dedicated settings rail, so keep the global rail
    // collapsed and prevent the saved workspace preference from reopening it.
    setSidebarOpen(!isSettingsRoute);
    setCollapsedTriggerSuppressed(isSettingsRoute);
  }, [isSettingsRoute, pathname]);
  useEffect(() => {
    if (isSettingsRoute) return;
    const savedSidebarState = window.localStorage.getItem(
      "zerocraft-sidebar-open",
    );
    if (savedSidebarState === "true" || savedSidebarState === "false") {
      setSidebarOpen(savedSidebarState === "true");
    }
  }, [isSettingsRoute]);
  useEffect(() => {
    window.localStorage.setItem("zerocraft-sidebar-open", String(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setSearchOpen((open) => {
          if (!open) {
            setQuery("");
            setActiveSearchIndex(0);
          }
          return !open;
        });
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setSidekickOpen((open) => !open);
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

  useEffect(() => {
    const onOpenSidekick = () => {
      setSidekickExpanded(false);
      setSidekickOpen(true);
    };
    window.addEventListener("zerocraft:open-sidekick", onOpenSidekick);
    return () =>
      window.removeEventListener("zerocraft:open-sidekick", onOpenSidekick);
  }, []);

  async function signOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setErrorMessage("");
    try {
      // Store pages are protected by the platform Supabase session in proxy.ts.
      // The legacy CMS session is separate, so signing out only that client
      // leaves /store/* authenticated and the page appears to stay open.
      const [platformResult, commerceResult] = await Promise.all([
        createPlatformClient().auth.signOut(),
        supabase.auth.signOut(),
      ]);
      if (platformResult.error) throw platformResult.error;
      if (commerceResult.error) throw commerceResult.error;
      window.location.replace("/login");
    } catch (error) {
      console.error("Sign out failed", error);
      setErrorMessage("Could not sign out. Please try again.");
      setIsSigningOut(false);
    }
  }

  return (
    <SidebarProvider
      open={effectiveSidebarOpen}
      onOpenChange={(nextOpen) => {
        if (isSettingsRoute) return;
        setSidebarOpen(nextOpen);
        setCollapsedTriggerSuppressed(!nextOpen);
      }}
      style={
        {
          "--sidebar-width": "216px",
          "--sidebar-width-icon": "64px",
        } as CSSProperties
      }
    >
      <div className="relative isolate flex h-dvh w-full overflow-hidden text-foreground ">
        <MobileNavigation
          open={mobileMenuOpen}
          onOpenChange={setMobileMenuOpen}
          pathname={pathname}
          navigation={workspaceNavigation}
          onSignOut={signOut}
          isSigningOut={isSigningOut}
        />

        {isSettingsRoute ? (
          <>
            <CmsSidebar
              pathname={pathname}
              navigation={workspaceNavigation}
              user={{ name: user.name, email: user.email }}
              isSigningOut={isSigningOut}
              onSignOut={() => void signOut()}
              unreadAlerts={unread}
              collapsed={!effectiveSidebarOpen}
              onOpenSearch={openSearch}
              collapsedTriggerSuppressed={
                isSettingsRoute || collapsedTriggerSuppressed
              }
              onCollapsedTriggerReveal={() =>
                !isSettingsRoute && setCollapsedTriggerSuppressed(false)
              }
              notices={notices}
              noticesOpen={noticesOpen}
              onNoticesOpenChange={setNoticesOpen}
              onReadNotice={(item) => void readNotice(item)}
              onMarkAllRead={() => void markAllNoticesRead()}
              onRefreshNotices={() => void loadNotifications()}
              onClearReadNotices={() => void clearReadNotices()}
              noticesLoading={noticesLoading}
            />
            <SettingsSidebar
              pathname={pathname}
              user={{ name: user.name, email: user.email }}
            />
          </>
        ) : (
          <CmsSidebar
            pathname={pathname}
            navigation={workspaceNavigation}
            user={{ name: user.name, email: user.email }}
            isSigningOut={isSigningOut}
            onSignOut={() => void signOut()}
            unreadAlerts={unread}
            collapsed={!effectiveSidebarOpen}
            onOpenSearch={openSearch}
            collapsedTriggerSuppressed={collapsedTriggerSuppressed}
            onCollapsedTriggerReveal={() =>
              setCollapsedTriggerSuppressed(false)
            }
            notices={notices}
            noticesOpen={noticesOpen}
            onNoticesOpenChange={setNoticesOpen}
            onReadNotice={(item) => void readNotice(item)}
            onMarkAllRead={() => void markAllNoticesRead()}
            onRefreshNotices={() => void loadNotifications()}
            onClearReadNotices={() => void clearReadNotices()}
            noticesLoading={noticesLoading}
          />
        )}

        {/* Main content */}
        <SidebarInset
          className={cn(
            isLiveView
              ? "min-h-0 min-w-0 overflow-hidden p-0"
              : "min-h-0 min-w-0 overflow-hidden py-2 pr-2 pl-0",
            "bg-primary",
            isSettingsRoute ? "flex gap-0 flex-row" : "flex gap-2 flex-row",
          )}
        >
          <div
            role="main"
            tabIndex={0}
            aria-label="Commerce content"
            data-studio-scroll
            className={cn(
              "min-w-0 flex-1",
              sidekickExpanded && "hidden",
              isLiveView
                ? "relative z-10 h-full w-auto min-h-0 overflow-hidden bg-background outline-none"
                : isSettingsRoute
                  ? "relative z-10 h-full w-auto min-h-0 overflow-y-auto overscroll-y-contain bg-secondary rounded-xl outline-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  : "relative z-10 h-full w-auto min-h-0 overflow-y-auto overscroll-y-contain outline-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-xl border border-border/70 bg-secondary",
            )}
          >
            <div
              data-studio-content
              className={
                isLiveView
                  ? "flex h-full min-h-0 w-full flex-col"
                  : isContentWorkspace
                    ? "flex min-h-full w-full flex-col p-3 sm:p-4"
                  : isSettingsRoute
                    ? "mx-auto flex min-h-full w-full max-w-4xl flex-col px-5 pb-10 pt-6 sm:px-8 lg:px-10 lg:pt-8"
                    : "my-3 mx-auto flex min-h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] flex-col px-4 pb-8 pt-8  sm:my-4 sm:min-h-[calc(100%-2rem)] sm:w-[calc(100%-2rem)] sm:px-6 sm:pb-10 lg:px-10 lg:pt-10 xl:px-14"
              }
            >
              {!isLiveView && !isSettingsRoute && !isContentWorkspace && breadcrumbs.length > 1 && (
                <Breadcrumb className="mb-3">
                  <BreadcrumbList className="text-xs">
                    {breadcrumbs.map((item, index) => (
                      <span key={`${item.href}-${index}`} className="contents">
                        {index > 0 && <BreadcrumbSeparator />}
                        <BreadcrumbItem>
                          {index === breadcrumbs.length - 1 ? (
                            <BreadcrumbPage>{item.label}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink render={<Link href={scopedPath(item.href, pathname)} />}>
                              {item.label}
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </span>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              )}
              {children}
            </div>
          </div>

          {features.assistant !== false && sidekickOpen && (
            <SidekickLauncher
              pathname={pathname}
              externalPrompt={commandPrompt}
              onPromptConsumed={() => setCommandPrompt("")}
              expanded={sidekickExpanded}
              onExpand={() => setSidekickExpanded((value) => !value)}
              onClose={() => {
                setSidekickOpen(false);
                setSidekickExpanded(false);
              }}
            />
          )}
        </SidebarInset>

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

        {/* Global alerts are rendered from the sidebar as an anchored Shopify-style popover. */}
        {false && (
          <Dialog open={noticesOpen} onOpenChange={setNoticesOpen}>
            <DialogContent className="w-[min(24rem,calc(100vw-2rem))] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Notifications
                  {unread > 0 && (
                    <Badge variant="secondary">{unread} new</Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={`ml-auto gap-1.5 text-[10px] ${notificationsRealtime === "connected" ? "text-emerald-600" : notificationsRealtime === "offline" ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${notificationsRealtime === "connected" ? "bg-emerald-500" : notificationsRealtime === "offline" ? "bg-destructive" : "bg-muted-foreground"}`}
                    />
                    {notificationsRealtime === "connected"
                      ? "Live"
                      : notificationsRealtime === "offline"
                        ? "Offline"
                        : "Connecting"}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Updates and activity from your studio workspace.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-between border-b pb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void loadNotifications()}
                  disabled={noticesLoading}
                >
                  <IconRefresh
                    className={noticesLoading ? "animate-spin" : ""}
                  />
                  Refresh
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!unread}
                  onClick={() => void markAllNoticesRead()}
                >
                  Mark all read
                </Button>
              </div>
              <ScrollArea className="h-80 max-h-[40vh]">
                <div className="mt-3 space-y-2 pr-3">
                  {latestNotices.length ? (
                    latestNotices.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => void readNotice(item)}
                        className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted ${!item.read ? "border-primary/30 bg-primary/[0.03]" : ""}`}
                      >
                        <span className="flex items-center justify-between gap-2 text-sm font-medium">
                          <span className="flex min-w-0 items-center gap-2">
                            {!item.read && (
                              <span className="size-2 rounded-full bg-primary" />
                            )}
                            <span className="truncate">{item.title}</span>
                          </span>
                          <Badge
                            variant="outline"
                            className="shrink-0 text-[10px] capitalize"
                          >
                            {item.type}
                          </Badge>
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {item.message}
                        </span>
                        <span className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                          <span className="capitalize">{item.category}</span>
                          <span>
                            {new Date(item.created_at).toLocaleString()}
                          </span>
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
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <span className="text-xs text-muted-foreground">
                  Showing the latest {Math.min(latestNotices.length, 6)} alerts
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <Link
                      href="/notifications"
                      onClick={() => setNoticesOpen(false)}
                    />
                  }
                >
                  View all
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <Dialog
          open={searchOpen}
          onOpenChange={(open) => {
            setSearchOpen(open);
            if (!open) setQuery("");
          }}
        >
          <DialogContent
            showCloseButton={false}
            onKeyDown={handleSearchKeyDown}
            className="top-[18vh] max-h-[min(39rem,76vh)] w-[min(42rem,calc(100vw-1.5rem))] translate-y-0 gap-0 overflow-hidden rounded-2xl border border-border/80 bg-popover p-0 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:max-w-2xl"
          >
            <DialogHeader className="sr-only">
              <DialogTitle>Search studio</DialogTitle>
              <DialogDescription>
                Search pages and create new studio content.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-3 border-b border-border px-4 sm:px-5">
              <IconSearch className="size-5 shrink-0 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveSearchIndex(0);
                }}
                placeholder="Search pages and actions..."
                aria-label="Search studio pages and actions"
                aria-controls="studio-search-results"
                aria-activedescendant={
                  searchResults.length
                    ? `studio-search-result-${activeSearchIndex}`
                    : undefined
                }
                className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/75 sm:h-16"
              />
              <kbd className="hidden rounded-md border border-border bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground sm:inline-flex">
                ESC
              </kbd>
            </div>

            <div
              id="studio-search-results"
              role="listbox"
              aria-label="Search results"
              className="no-scrollbar max-h-[min(30rem,62vh)] overflow-y-auto p-2.5 sm:p-3"
            >
              {!searchResults.length && (
                <div className="grid min-h-44 place-items-center px-6 text-center">
                  <div>
                    <span className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
                      <IconSearch className="size-4" />
                    </span>
                    <p className="text-sm font-medium">No results found</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Try a page name such as products, orders, or settings.
                    </p>
                  </div>
                </div>
              )}

              {(["Create", "Navigation"] as const).map((section) => {
                const sectionItems = searchResults.filter(
                  (item) => item.section === section,
                );
                if (!sectionItems.length) return null;
                return (
                  <section
                    key={section}
                    aria-labelledby={`studio-search-${section.toLowerCase()}`}
                    className="mb-3 last:mb-0"
                  >
                    <p
                      id={`studio-search-${section.toLowerCase()}`}
                      className="px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                    >
                      {section}
                    </p>
                    <div className="space-y-1">
                      {sectionItems.map(
                        ({ label, href, icon: Icon, section: itemSection }) => {
                          const index = searchResults.findIndex(
                            (item) =>
                              item.href === href &&
                              item.section === itemSection,
                          );
                          const active = index === activeSearchIndex;
                          return (
                            <button
                              id={`studio-search-result-${index}`}
                              key={`${itemSection}-${href}-${index}`}
                              type="button"
                              role="option"
                              aria-selected={active}
                              onMouseMove={() => setActiveSearchIndex(index)}
                              onFocus={() => setActiveSearchIndex(index)}
                              onClick={() => goToSearchResult(href)}
                              className={`group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm outline-none transition-colors ${active ? "bg-foreground text-background" : "text-foreground hover:bg-muted"}`}
                            >
                              <span
                                className={`grid size-8 shrink-0 place-items-center rounded-lg ${active ? "bg-background/15 text-background" : "bg-muted text-muted-foreground"}`}
                              >
                                {itemSection === "Create" ? (
                                  <IconPlus className="size-4" />
                                ) : (
                                  <Icon className="size-4" />
                                )}
                              </span>
                              <span className="min-w-0 flex-1 truncate font-medium">
                                {label}
                              </span>
                              <span
                                className={`flex items-center gap-2 text-xs ${active ? "text-background/65" : "text-muted-foreground"}`}
                              >
                                {itemSection === "Create" && (
                                  <Icon className="size-4" />
                                )}
                                <IconArrowUpRight className="size-4" />
                              </span>
                            </button>
                          );
                        },
                      )}
                    </div>
                  </section>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-border bg-muted/35 px-4 py-2.5 text-[11px] text-muted-foreground sm:px-5">
              <span>
                {searchResults.length}{" "}
                {searchResults.length === 1 ? "result" : "results"}
              </span>
              <span className="hidden items-center gap-3 sm:flex">
                <span>
                  <kbd className="font-sans">↑↓</kbd> navigate
                </span>
                <span>
                  <kbd className="font-sans">↵</kbd> open
                </span>
              </span>
            </div>
          </DialogContent>
        </Dialog>

        {!isSettingsRoute && features.assistant !== false && (
          <>
            {!sidekickOpen && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendBottomPrompt();
                }}
                className="fixed bottom-5 left-1/2 z-[70] w-[min(380px,calc(100vw-1.5rem))] -translate-x-1/2"
                aria-label="Ask Zerocraft"
              >
                <InputGroup className="h-12 flex-row items-center gap-1 rounded-4xl bg-background! p-3 shadow-md ">
                  <InputGroupAddon
                    align="inline-start"
                    className="shrink-0 p-0"
                  >
                    <span
                      className="grid size-7 place-items-center rounded-full bg-muted text-foreground"
                      aria-hidden="true"
                    >
                      <IconSparkles className="size-4" />
                    </span>
                  </InputGroupAddon>
                  <InputGroupTextarea
                    value={bottomPrompt}
                    onChange={(event) => setBottomPrompt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder="Work with Sidekick"
                    aria-label="Work with Sidekick"
                    rows={1}
                    className="min-h-8 max-h-8 min-w-0 resize-none overflow-hidden border-0 px-1 py-1 text-[13px] shadow-none focus-visible:ring-0"
                  />
                  <InputGroupAddon
                    align="inline-end"
                    className="shrink-0 gap-1 p-0"
                  >
                    <InputGroupButton
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      className="size-7 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Add files"
                      title="Attach text, CSV, Markdown, or JSON files"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <IconPaperclip className="size-4" />
                      {attachedFiles.length > 0 && (
                        <span className="text-[10px]">
                          {attachedFiles.length}
                        </span>
                      )}
                    </InputGroupButton>
                    <InputGroupButton
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      className="size-7 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Voice command"
                      title="Speak a command"
                      onClick={startVoiceCommand}
                    >
                      <IconMicrophone className="size-4" />
                    </InputGroupButton>
                    <span
                      className="mx-0.5 h-5 w-px bg-border"
                      aria-hidden="true"
                    />
                    <InputGroupButton
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      className="size-7 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Expand assistant panel"
                      title="Open AI assistant"
                      onClick={() => {
                        setSidekickExpanded(false);
                        setSidekickOpen(true);
                      }}
                    >
                      <IconLayoutSidebarRight className="size-4" />
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </form>
            )}
          </>
        )}
      </div>
    </SidebarProvider>
  );
}
