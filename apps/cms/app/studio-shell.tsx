"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  IconArrowUpRight,
  IconBriefcase,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { StudioSidebar } from "@/components/navigations/studio-sidebar";
import { SettingsSidebar } from "@/components/navigations/settings-sidebar";
import {
  supabase,
  type StudioNotification,
  fetchNotificationsFromSupabase,
  markAllNotificationsAsReadInSupabase,
  markNotificationAsReadInSupabase,
  clearReadNotificationsInSupabase,
} from "@/lib/supabase-client";
import {
  getAdminNavigationForRole,
  getAdminNavigationForFeatures,
  getAdminRoutePermission,
  getAdminRouteFeature,
  getAdminBreadcrumbs,
  isAdminNavigationGroupActive,
  isAdminRouteActive,
} from "@/lib/admin-navigation";
import { STUDIO_FEATURES, type StudioFeatureKey } from "@/lib/studio-features";
import { StudioSidekick } from "@/components/studio/studio-sidekick";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
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

type SpeechRecognitionResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: (() => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export default function StudioShell({ children, user }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [commandPrompt, setCommandPrompt] = useState("");
  const [bottomPrompt, setBottomPrompt] = useState("");
  const [sidekickOpen, setSidekickOpen] = useState(false);
  const [sidekickExpanded, setSidekickExpanded] = useState(false);
  const [sidekickHydrated, setSidekickHydrated] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [query, setQuery] = useState("");
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [notices, setNotices] = useState<StudioNotification[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [notificationsRealtime, setNotificationsRealtime] = useState<
    "connecting" | "connected" | "offline"
  >("connecting");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [collapsedTriggerSuppressed, setCollapsedTriggerSuppressed] =
    useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [permissions, setPermissions] = useState<string[] | null>(null);
  const [features, setFeatures] = useState<Record<StudioFeatureKey, boolean>>(
    () =>
      Object.fromEntries(
        STUDIO_FEATURES.map((feature) => [feature.key, feature.enabled]),
      ) as Record<StudioFeatureKey, boolean>,
  );
  const navigation = useMemo(
    () =>
      getAdminNavigationForFeatures(
        getAdminNavigationForRole(user.role, permissions),
        new Set(
          Object.entries(features)
            .filter(([, enabled]) => enabled)
            .map(([key]) => key as StudioFeatureKey),
        ),
      ),
    [user.role, permissions, features],
  );
  const workspaceNavigation = useMemo(() => navigation, [navigation]);
  const navigationLinks = useMemo(
    () => workspaceNavigation.flatMap((group) => group.links),
    [workspaceNavigation],
  );
  const results = useMemo(
    () =>
      navigationLinks.filter((item) =>
        item.label.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [navigationLinks, query],
  );
  const actionResults = useMemo(
    () =>
      quickActions.filter((item) =>
        item.label.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [query],
  );
  const searchResults = useMemo(
    () => [
      ...actionResults.map((item) => ({ ...item, section: "Create" as const })),
      ...results.map((item) => ({ ...item, section: "Navigation" as const })),
    ],
    [actionResults, results],
  );
  const unread = notices.filter((item) => !item.read).length;
  const latestNotices = notices.slice(0, 6);
  const breadcrumbs = getAdminBreadcrumbs(pathname);
  const isLiveView = pathname === "/analytics/live-view";
  const isSettingsRoute =
    pathname === "/settings" || pathname.startsWith("/settings/");
  const effectiveSidebarOpen = isSettingsRoute ? false : sidebarOpen;

  useEffect(() => {
    const savedOpen = window.localStorage.getItem("zerocraft-sidekick-open");
    if (savedOpen === "true") setSidekickOpen(true);
    // A refresh always returns an open assistant to the compact right panel.
    // Expanded mode is intentionally session-only.
    window.localStorage.removeItem("zerocraft-sidekick-expanded");
    setSidekickExpanded(false);
    setSidekickHydrated(true);
  }, []);

  useEffect(() => {
    if (!sidekickHydrated) return;
    window.localStorage.setItem("zerocraft-sidekick-open", String(sidekickOpen));
  }, [sidekickHydrated, sidekickOpen, sidekickExpanded]);

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
    let current = true;
    const onFeatureChange = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string; enabled?: boolean }>)
        .detail;
      if (!detail?.key || typeof detail.enabled !== "boolean") return;
      setFeatures((value) => ({
        ...value,
        [detail.key as StudioFeatureKey]: detail.enabled,
      }));
    };
    window.addEventListener("studio-feature-change", onFeatureChange);
    void fetch("/api/studio/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json();
        if (current && Array.isArray(payload.permissions))
          setPermissions(payload.permissions);
      })
      .catch(() => undefined);
    void fetch("/api/studio/features", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as {
          features?: Array<{ feature_key: StudioFeatureKey; enabled: boolean }>;
        };
        if (current && Array.isArray(payload.features)) {
          setFeatures((value) => ({
            ...value,
            ...Object.fromEntries(
              payload.features!.map((feature) => [
                feature.feature_key,
                feature.enabled,
              ]),
            ),
          }));
        }
      })
      .catch(() => undefined);
    return () => {
      current = false;
      window.removeEventListener("studio-feature-change", onFeatureChange);
    };
  }, []);
  useEffect(() => {
    if (!permissions) return;
    const required = getAdminRoutePermission(pathname);
    if (required && !permissions.includes(required)) router.replace("/");
    const feature = getAdminRouteFeature(pathname);
    if (feature && features[feature] === false) router.replace("/");
  }, [pathname, permissions, features, router]);
  const loadNotifications = useCallback(async () => {
    setNoticesLoading(true);
    try {
      const data = await fetchNotificationsFromSupabase();
      setNotices(data);
    } catch (error) {
      console.error("Could not load notifications", error);
    } finally {
      setNoticesLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const initialLoad = window.setTimeout(() => void loadNotifications(), 0);
    const refreshTimer = window.setInterval(
      () => void loadNotifications(),
      60_000,
    );
    void supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      channel = supabase.channel(`studio-notices:${data.user.id}`);
      channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${data.user.id}`,
          },
          () => void loadNotifications(),
        )
        .subscribe((status) => {
          if (!active) return;
          setNotificationsRealtime(
            status === "SUBSCRIBED"
              ? "connected"
              : status === "CHANNEL_ERROR" || status === "TIMED_OUT"
                ? "offline"
                : "connecting",
          );
        });
    });
    return () => {
      active = false;
      window.clearTimeout(initialLoad);
      window.clearInterval(refreshTimer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [loadNotifications]);

  function openSearch() {
    setQuery("");
    setActiveSearchIndex(0);
    setSearchOpen(true);
  }

  function goToSearchResult(href: string) {
    router.push(href);
    setSearchOpen(false);
    setQuery("");
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!searchResults.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSearchIndex((index) => (index + 1) % searchResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSearchIndex((index) =>
        index === 0 ? searchResults.length - 1 : index - 1,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      goToSearchResult(searchResults[activeSearchIndex].href);
    }
  }

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

  async function markAllNoticesRead() {
    try {
      await markAllNotificationsAsReadInSupabase();
      setNotices((items) => items.map((item) => ({ ...item, read: true })));
    } catch (error) {
      console.error("Could not mark all notifications as read", error);
    }
  }

  async function clearReadNotices() {
    const cleared = await clearReadNotificationsInSupabase();
    if (cleared) setNotices((items) => items.filter((item) => !item.read));
  }

  async function sendBottomPrompt(value = bottomPrompt) {
    const prompt = value.trim();
    if (!prompt) return;
    let finalPrompt = prompt;
    const selectedFiles = attachedFiles.slice(0, 3);
    if (selectedFiles.length) {
      try {
        const fileContext = await Promise.all(
          selectedFiles.map(async (file) => {
            const contents = await file.text();
            return `\n\n[Attached file: ${file.name}]\n${contents.slice(0, 6000)}`;
          }),
        );
        finalPrompt += fileContext.join("").slice(0, 12000);
      } catch {
        setVoiceStatus(
          "Could not read the selected file. Try a text, CSV, Markdown, or JSON file.",
        );
        return;
      }
    }
    setCommandPrompt(finalPrompt);
    setBottomPrompt("");
    setAttachedFiles([]);
    setSidekickOpen(true);
    setVoiceStatus("");
  }

  function startVoiceCommand() {
    const browserWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition =
      browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceStatus("Voice input is not supported in this browser.");
      return;
    }
    voiceRecognitionRef.current?.stop();
    const recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setVoiceStatus("Listening…");
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) void sendBottomPrompt(transcript);
    };
    recognition.onerror = () =>
      setVoiceStatus("Could not hear that. Please try again.");
    recognition.onend = () => {
      voiceRecognitionRef.current = null;
    };
    voiceRecognitionRef.current = recognition;
    recognition.start();
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
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent
            side="left"
            className="w-[min(18rem,88vw)] gap-0 p-3 lg:hidden"
          >
            <SheetHeader className="border-b px-1 pb-4 pt-1 text-left">
              <SheetTitle className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-[#151515]">
                  <Image
                    src="/icon.svg"
                    alt=""
                    width={24}
                    height={24}
                    className="size-6"
                    priority
                  />
                </span>
                ZeroCraft CMS
              </SheetTitle>
              <SheetDescription>Workspace navigation</SheetDescription>
            </SheetHeader>
            <nav
              className="mt-3 space-y-0.5 overflow-y-auto"
              aria-label="Mobile CMS navigation"
            >
              {workspaceNavigation.map((group) => {
                const groupActive = isAdminNavigationGroupActive(
                  pathname,
                  group,
                );
                const childLinks = group.links.filter(
                  (link) => link.href !== group.href,
                );
                const GroupIcon = group.icon;
                return (
                  <div key={group.label}>
                    <Link
                      href={group.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${pathname === group.href ? "bg-muted font-medium text-foreground" : groupActive ? "font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                    >
                      <GroupIcon className="size-[18px]" stroke={1.7} />
                      {group.label}
                    </Link>
                    {groupActive && childLinks.length > 0 && (
                      <div className="mb-1 mt-0.5 space-y-0.5 py-0.5">
                        {childLinks.map(({ label, href }) => {
                          const childActive = isAdminRouteActive(
                            pathname,
                            href,
                          );
                          return (
                            <Link
                              key={href}
                              href={href}
                              onClick={() => setMobileMenuOpen(false)}
                              aria-current={childActive ? "page" : undefined}
                              className={`flex min-h-8 items-center rounded-lg py-1 pl-9 pr-2.5 text-[13px] transition-colors ${childActive ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                            >
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
            <div className="mt-4 border-t pt-3">
              <a
                href="mailto:hello@zerocraft.in?subject=CMS%20support"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <IconHelpCircle className="size-[18px]" /> Help &amp; support
              </a>
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <IconSettings className="size-[18px]" /> Settings
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                disabled={isSigningOut}
                className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              >
                <IconLogout className="size-[18px]" />{" "}
                {isSigningOut ? "Logging out…" : "Log out"}
              </button>
            </div>
          </SheetContent>
        </Sheet>

        {isSettingsRoute ? (
          <>
            <StudioSidebar
              pathname={pathname}
              navigation={workspaceNavigation}
              user={{ name: user.name, email: user.email }}
              unreadAlerts={unread}
              isSigningOut={isSigningOut}
              onSignOut={() => void signOut()}
              collapsed={!effectiveSidebarOpen}
              onOpenSearch={openSearch}
              collapsedTriggerSuppressed={isSettingsRoute || collapsedTriggerSuppressed}
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
          <StudioSidebar
            pathname={pathname}
            navigation={workspaceNavigation}
            user={{ name: user.name, email: user.email }}
            unreadAlerts={unread}
            isSigningOut={isSigningOut}
            onSignOut={() => void signOut()}
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
              : "min-h-0 min-w-0 overflow-hidden p-2",
            isSettingsRoute ? "flex gap-0 flex-row" : "flex gap-2 flex-row",
          )}
        >
          <div
            role="main"
            tabIndex={0}
            aria-label="Studio content"
            data-studio-scroll
            className={cn(
              sidekickExpanded && "hidden",
              isLiveView
                ? "relative z-10 h-full w-full min-h-0 min-w-0 overflow-hidden bg-background outline-none"
                : isSettingsRoute
                  ? "relative z-10 h-full w-full min-h-0 min-w-0 overflow-y-auto overscroll-y-contain bg-muted rounded-xl outline-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  : "relative z-10 h-full w-full min-h-0 min-w-0 overflow-y-auto overscroll-y-contain outline-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-xl border border-border/70 bg-muted"
            )}
          >
            <div
              data-studio-content
              className={
                isLiveView
                  ? "flex h-full min-h-0 w-full flex-col"
                  : isSettingsRoute
                    ? "mx-auto flex min-h-full w-full max-w-4xl flex-col px-5 pb-10 pt-6 sm:px-8 lg:px-10 lg:pt-8"
                    : "my-3 mx-auto flex min-h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] flex-col px-4 pb-8 pt-8  sm:my-4 sm:min-h-[calc(100%-2rem)] sm:w-[calc(100%-2rem)] sm:px-6 sm:pb-10 lg:px-10 lg:pt-10 xl:px-14"
              }
            >
              {!isLiveView && !isSettingsRoute && breadcrumbs.length > 1 && (
                <Breadcrumb className="mb-3">
                  <BreadcrumbList className="text-xs">
                    {breadcrumbs.map((item, index) => (
                      <span key={`${item.href}-${index}`} className="contents">
                        {index > 0 && <BreadcrumbSeparator />}
                        <BreadcrumbItem>
                          {index === breadcrumbs.length - 1 ? (
                            <BreadcrumbPage>{item.label}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink render={<Link href={item.href} />}>
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

          {!isSettingsRoute && features.assistant !== false && sidekickOpen && (
            <StudioSidekick
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
        {false && <Dialog open={noticesOpen} onOpenChange={setNoticesOpen}>
          <DialogContent className="w-[min(24rem,calc(100vw-2rem))] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Notifications
                {unread > 0 && <Badge variant="secondary">{unread} new</Badge>}
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
                <IconRefresh className={noticesLoading ? "animate-spin" : ""} />
                Refresh
              </Button>
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
        </Dialog>}

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
