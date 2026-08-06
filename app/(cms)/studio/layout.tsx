"use client";
import "./globals.css";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconHome,
  IconLayoutDashboard,
  IconBell,
  IconUsers,
  IconPercentage,
  IconTarget,
  IconHelpCircle,
  IconSettings,
  IconSearch,
  IconLogout,
  IconArrowRight,
  IconSparkles,
  IconFileText,
  IconBriefcase,
  IconCalendar,
  IconStar,
  IconChevronDown,
  IconKeyboard,
} from "@tabler/icons-react";
import {
  StudioUser,
  ensureUserProfile,
  StudioNotification,
  fetchNotificationsFromSupabase,
  markNotificationAsReadInSupabase,
  markAllNotificationsAsReadInSupabase,
} from "@/lib/supabase-client";
import { useCurrency } from "@/lib/currency-context";
import { CurrencySwitcherCombobox } from "@/components/currency-switcher-combobox";
import { createClient } from "@/utils/supabase/client";
import { useTheme } from "next-themes";
import { Kbd } from "@/components/ui/kbd";
// shadcn UI components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";


import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  Command,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { useAuthStore } from "@/store/useAuthStore";
import dynamic from "next/dynamic";
import { Providers } from "@/components/providers/provider";
const SettingsModal = dynamic(
  () => import("@/components/settings-modal").then((mod) => mod.SettingsModal),
  { ssr: false }
);

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [currentUser, setCurrentUser] = useState<StudioUser>({
    id: "",
    email: "user@zerocraft.design",
    fullName: "Studio Admin",
    role: "admin",
    avatarUrl: "",
  });
  const [loading, setLoading] = useState(false);
  // Command IconSearch Dialog State
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Notifications State & Desktop Push Permission
  const [notifications, setNotifications] = useState<StudioNotification[]>([]);
  const [pushPermission, setPushPermission] =
    useState<NotificationPermission>("default");

  const supabase = createClient();

  const loadNotifications = async () => {
    const data = await fetchNotificationsFromSupabase();
    setNotifications(data);
  };

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  const requestDesktopPushPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const perm = await Notification.requestPermission();
      setPushPermission(perm);
      if (perm === "granted") {
        const n = new Notification("Zerocraft Studio Push Active", {
          body: "Desktop push alerts are now active for appointments, clients, and system events.",
        });
        n.onclick = () => window.focus();
      }
    }
  };

  const triggerTestDesktopPush = () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        const n = new Notification("Test Desktop Push Alert 🚀", {
          body: "Zerocraft Studio real-time notification engine working perfectly!",
        });
        n.onclick = () => window.focus();
      } else {
        requestDesktopPushPermission();
      }
    }
  };

  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel("header-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload: any) => {
          loadNotifications();
          const newNotif = payload.new;
          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted" &&
            newNotif
          ) {
            const desktopNotif = new Notification(
              newNotif.title || "Zerocraft Studio Alert",
              {
                body: newNotif.message || "New activity recorded.",
                tag: newNotif.id,
              },
            );

            desktopNotif.onclick = () => {
              window.focus();
              if (newNotif.link) {
                router.push(newNotif.link);
              }
            };
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        () => {
          loadNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string, link?: string) => {
    await markNotificationAsReadInSupabase(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    if (link) {
      router.push(link);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsReadInSupabase();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const { theme, setTheme } = useTheme();
  const { currency, setCurrency, activeConfig } = useCurrency();
  const [shortcutToast, setShortcutToast] = useState<string | null>(null);

  const showShortcutFeedback = (msg: string) => {
    setShortcutToast(msg);
    setTimeout(() => setShortcutToast(null), 2500);
  };

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const profile: any = await ensureUserProfile(user);
        const isOwner = user.email === "ivd.maran@gmail.com";
        setCurrentUser({
          id: user.id,
          email: user.email || "",
          fullName:
            profile?.full_name ||
            (isOwner
              ? "Maran (Owner)"
              : user.email?.split("@")[0] || "Studio User"),
          role: isOwner ? "admin" : profile?.role || "staff",
          avatarUrl:
            profile?.avatar_url ||
            user.user_metadata?.avatar_url ||
            `https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&fit=crop`,
        });
      }
    };

    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const profile: any = await ensureUserProfile(session.user);
          const isOwner = session.user.email === "ivd.maran@gmail.com";
          setCurrentUser({
            id: session.user.id,
            email: session.user.email || "",
            fullName:
              profile?.full_name ||
              (isOwner
                ? "Maran (Owner)"
                : session.user.email?.split("@")[0] || "Studio User"),
            role: isOwner ? "admin" : profile?.role || "staff",
            avatarUrl:
              profile?.avatar_url ||
              session.user.user_metadata?.avatar_url ||
              `https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&fit=crop`,
          });
        }
      },
    );

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // 1. ⌘K / Ctrl K: Quick Search Modal
      if (isCmdOrCtrl && key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }

      // 2. ⌘S / Ctrl S: Save Settings / Global Save Action
      if (isCmdOrCtrl && !e.shiftKey && key === "s") {
        e.preventDefault();
        showShortcutFeedback("⌘S Triggered: Opening Settings Center");
        router.push("/studio/settings");
      }

      // 3. ⌘N / Ctrl N: Add New Client / Work
      if (isCmdOrCtrl && !e.shiftKey && key === "n") {
        e.preventDefault();
        showShortcutFeedback("⌘N Triggered: Opening Clients CRM");
        router.push("/studio/clients");
      }

      // 4. ⌘ Shift D / Ctrl Shift D: Toggle Theme Mode
      if (isCmdOrCtrl && e.shiftKey && key === "d") {
        e.preventDefault();
        const nextTheme = theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        showShortcutFeedback(
          `⌘ShiftD Triggered: Switched Theme to ${nextTheme.toUpperCase()} Mode`,
        );
      }

      // 5. ⌘ Shift R / Ctrl Shift R: Database Sync & Page Refresh
      if (isCmdOrCtrl && e.shiftKey && key === "r") {
        e.preventDefault();
        showShortcutFeedback(
          "⌘ShiftR Triggered: Re-synchronizing Studio Database...",
        );
        setTimeout(() => window.location.reload(), 300);
      }

      // 6. Esc: Close Search / Modals
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      authListener?.subscription.unsubscribe();
    };
  }, [theme]);

  const navLinks = [
    { title: "Home", href: "/", icon: IconHome },
    {
      title: "Dashboard",
      href: "/studio",
      icon: IconLayoutDashboard,
      badge: "Main",
    },
    { title: "Blogs", href: "/studio/blogs", icon: IconFileText, badge: "3" },
    {
      title: "Works",
      href: "/studio/works",
      icon: IconBriefcase,
      badge: "Featured",
    },
    {
      title: "Clients",
      href: "/studio/clients",
      icon: IconUsers,
      badge: "CRM",
    },
    { title: "Appointments", href: "/studio/appointments", icon: IconCalendar },
    { title: "Reviews", href: "/studio/reviews", icon: IconStar },
    { title: "Analytics", href: "/studio/reports", icon: IconPercentage },
    { title: "Goals", href: "/studio/goals", icon: IconTarget },
  ];

  // Global IconSearch Index Aggregation
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];

    const q = searchQuery.toLowerCase();
    const results: {
      type: "Blog" | "Work" | "Client" | "Appointment" | "Review" | "Page";
      title: string;
      subtitle: string;
      url: string;
      icon: any;
    }[] = [];

    // IconSearch Pages
    navLinks.forEach((link) => {
      if (link.title.toLowerCase().includes(q)) {
        results.push({
          type: "Page",
          title: link.title,
          subtitle: `Navigate to ${link.title}`,
          url: link.href,
          icon: link.icon,
        });
      }
    });

    return results;
  }, [searchQuery]);

  const handleSelectResult = (url: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    router.push(url);
  };

  const handleLogout = async () => {
    setLoading(true);
    await logout();
    setLoading(false);

    // Redirect to login after logout
    router.push("/login");
    router.refresh();
  };
  return (

    <Providers >
      <div className="min-h-screen bg-background text-foreground font-sans selection:bg-[#22C55E] selection:text-foreground flex flex-col antialiased">
        {/* Top Header Bar */}
        <header className="h-20 bg-background backdrop-blur-md px-8 flex items-center justify-between gap-4 sticky top-0 z-30 border-b border-border">
          {/* Brand Logo (Green Dual Chevron) */}
          <Link
            href="/studio"
            className="p-2 rounded-2xl bg-muted hover:bg-accent border border-border transition-colors group"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-7 h-7 fill-primary "
            >
              <path d="M5.16.43c4.97,7.25,9.93,8.51,14.9,3.78,1.09,1.24,1.94,2.48,2.53,3.71-2.41,3.97-7.69,4.08-11.59,6.41,4.15-.64,8.18-.19,12.08,1.37-.44,1.21-1.13,2.42-2.07,3.63-5.6-5.34-11.2-3.92-16.8,4.26-1.48-1.89-2.57-3.78-3.3-5.67,2.87-6.36,8.78-7.1,12.63-8.59-3.92-.16-7.97-1.26-12.14-3.32.88-1.86,2.13-3.72,3.76-5.58h0Z" />
            </svg>
          </Link>
          {/* Pill IconSearch Bar */}
          <div className="hidden sm:flex items-center max-w-lg w-full">
            <InputGroup className="h-10" onClick={() => setSearchOpen(true)}>
              <InputGroupInput placeholder="Search..." className="" />
              <InputGroupAddon>
                <IconSearch className="text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupAddon align="inline-end">
                <Kbd>⌘K</Kbd>
              </InputGroupAddon>
            </InputGroup>
          </div>

          {/* Top Right Controls: Role Select, Notifications Pill & User Avatar */}
          <div className="flex items-center gap-3">
            {/* Interactive Realtime Notification Center Drawer */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="relative rounded-xl border-border bg-background hover:bg-accent h-10 w-10"
                  aria-label={`Notifications (${unreadCount})`}
                >
                  <IconBell className="w-4 h-4 text-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-md animate-pulse">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-80 sm:w-96 p-0 rounded-2xl bg-muted border border-border shadow-2xl overflow-hidden"
                align="end"
                sideOffset={10}
              >
                {/* Notification Drawer Header */}
                <div className="p-3.5 border-b border-border flex items-center justify-between bg-background/60">
                  <div className="flex items-center gap-2">
                    <IconBell className="w-4 h-4 text-[#22C55E]" />
                    <span className="text-xs font-bold text-foreground">
                      Notifications Center
                    </span>
                    {unreadCount > 0 && (
                      <Badge className="bg-rose-500/15 border-rose-500/30 text-rose-300 text-[10px] px-1.5 py-0.2 font-bold">
                        {unreadCount} Unread
                      </Badge>
                    )}
                  </div>

                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-semibold text-[#22C55E] hover:underline transition-all"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {/* Desktop Push Banner Status */}
                <div className="p-2.5 px-3.5 bg-background border-b border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="relative flex h-2 w-2">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pushPermission === "granted" ? "bg-[#22C55E]" : "bg-amber-400"} opacity-75`}
                      ></span>
                      <span
                        className={`relative inline-flex rounded-full h-2 w-2 ${pushPermission === "granted" ? "bg-[#22C55E]" : "bg-amber-400"}`}
                      ></span>
                    </span>
                    <span className="text-[11px] font-semibold text-foreground">
                      {pushPermission === "granted"
                        ? "Desktop Push Active"
                        : pushPermission === "denied"
                          ? "Desktop Push Blocked"
                          : "Desktop Push Disabled"}
                    </span>
                  </div>

                  {pushPermission === "granted" ? (
                    <button
                      onClick={triggerTestDesktopPush}
                      className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/20 transition-all"
                    >
                      Test Desktop Push 🚀
                    </button>
                  ) : (
                    <button
                      onClick={requestDesktopPushPermission}
                      className="px-2.5 py-0.5 rounded-lg bg-[#22C55E] text-black text-[10px] font-bold hover:bg-[#22C55E]/90 transition-all shadow-sm"
                    >
                      Enable Push Alerts
                    </button>
                  )}
                </div>

                {/* Notification List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      No notifications in history.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleMarkAsRead(n.id, n.link)}
                        className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 hover:bg-accent/60 ${!n.read ? "bg-accent/40" : "bg-transparent opacity-80"
                          }`}
                      >
                        <div className="p-2 rounded-xl bg-background border border-border shrink-0 mt-0.5">
                          {n.category === "appointments" ? (
                            <IconCalendar className="w-3.5 h-3.5 text-[#22C55E]" />
                          ) : n.category === "clients" ? (
                            <IconUsers className="w-3.5 h-3.5 text-purple-400" />
                          ) : n.category === "works" ? (
                            <IconBriefcase className="w-3.5 h-3.5 text-blue-400" />
                          ) : (
                            <IconSparkles className="w-3.5 h-3.5 text-amber-400" />
                          )}
                        </div>

                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-bold text-foreground truncate">
                              {n.title}
                            </h4>
                            {!n.read && (
                              <span className="w-2 h-2 rounded-full bg-[#22C55E] shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                          <div className="text-[9px] text-muted-foreground font-mono pt-1">
                            {new Date(n.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Notification Drawer Footer */}
                <div className="p-2.5 border-t border-border bg-background/60 text-center">
                  <Link
                    href="#settings"
                    className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Configure Notification Alerts & Preferences
                  </Link>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Global Multi-Currency Selector Combobox (FlagCDN + Search Pattern) */}
            <CurrencySwitcherCombobox className="w-auto" />

            {/* Theme Toggle Component */}
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" size="lg" />}
              >
                <div className="gap-1.5 flex items-center">
                  <Avatar className="size-5">
                    <AvatarImage
                      src={currentUser.avatarUrl}
                      alt={currentUser.fullName}
                    />
                    <AvatarFallback>
                      {" "}
                      {currentUser.fullName
                        ? currentUser.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                        : "ZS"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {currentUser.fullName}
                  </span>
                </div>
                <IconChevronDown
                  className="ml-auto size-4 opacity-60"
                  aria-hidden="true"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex items-center gap-2 py-2">
                    <Avatar className="size-8">
                      <AvatarImage
                        src={currentUser.avatarUrl}
                        alt={currentUser.fullName}
                      />
                      <AvatarFallback>
                        {" "}
                        {currentUser.fullName
                          ? currentUser.fullName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                          : "ZS"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-foreground text-sm font-medium">
                        {currentUser.fullName}
                      </span>
                      <span className="text-muted-foreground text-xs font-normal">
                        {currentUser.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    {/* <DropdownMenuItem>
                <UserIcon  aria-hidden="true" />
                Profile
                <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCardIcon  aria-hidden="true" />
                Billing
              </DropdownMenuItem> */}
                    <DropdownMenuItem
                      onClick={() => router.push("#settings")}
                    >
                      <IconSettings aria-hidden="true" />
                      Settings
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  {/* <DropdownMenuGroup>
              <DropdownMenuItem>
                <UsersIcon  aria-hidden="true" />
                Team
              </DropdownMenuItem>
              <DropdownMenuItem>
                <PlusIcon  aria-hidden="true" />
                Invite Members
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <LifeBuoyIcon  aria-hidden="true" />
                Support
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BookOpenIcon  aria-hidden="true" />
                Documentation
              </DropdownMenuItem>
            </DropdownMenuGroup> */}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={handleLogout}
                  >
                    <IconLogout aria-hidden="true" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Right Main Body Container */}
        <div className="flex-1 flex  min-w-0 min-h-screen">
          {/* Left Floating Slim Vertical Dark Dock */}
          <aside className="flex flex-col items-center justify-between py-6 px-4 top-20 h-[90%]  fixed z-40 shrink-0">
            <div className="flex flex-col items-center justify-between w-20 h-full">
              <div className="flex flex-col items-center gap-6 w-full">
                {/* Navigation Icons Dock */}
                <div className="flex flex-col items-center gap-2.5 w-full">
                  {navLinks.slice(0, 7).map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;

                    return (
                      <Tooltip key={link.title}>
                        <TooltipTrigger>
                          <Link
                            href={link.href}
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${isActive
                              ? "bg-primary text-primary-foreground font-bold shadow-lg scale-105"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              }`}
                          >
                            <Icon className="w-5 h-5" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {link.title}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Dock Items: Help & IconSettings */}
              <div className="flex flex-col items-center gap-2.5 w-full">
                <Tooltip>
                  <TooltipTrigger
                    onClick={() => router.push("/studio/support")}
                  >
                    <IconHelpCircle className="w-5 h-5" />
                  </TooltipTrigger>
                  <TooltipContent side="right">Help & Support</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger>
                    <Link
                      href="/studio/#settings"
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${pathname === "/studio/#settings"
                        ? "bg-primary text-primary-foreground font-bold shadow-lg scale-105"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        }`}
                    >
                      <IconSettings className="w-5 h-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    IconSettings & RBAC
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </aside>
          {/* Main Viewport Content */}
          <main className="flex-1 px-6 py-20 pb-12">{children}</main>
        </div>

        {/* Command IconSearch Dialog Modal */}
        <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
          <Command className="max-w-2xl">
            <CommandInput
              placeholder="Type to search..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="text-foreground"
            />
            <CommandList>
              <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
                No results found for "{searchQuery}".
              </CommandEmpty>

              {!searchQuery.trim() && (
                <CommandGroup heading="Quick Links">
                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <CommandItem
                        key={link.href}
                        onSelect={() => handleSelectResult(link.href)}
                        className="flex items-center justify-between cursor-pointer py-2.5 px-3 text-xs text-foreground hover:text-accent-foreground hover:bg-accent rounded-xl"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4 text-[#22C55E]" />
                          <span className="font-medium">{link.title}</span>
                        </div>
                        {link.badge && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-muted text-muted-foreground border border-border rounded-lg"
                          >
                            {link.badge}
                          </Badge>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {searchResults.length > 0 && (
                <CommandGroup heading="Search Results">
                  {searchResults.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <CommandItem
                        key={idx}
                        onSelect={() => handleSelectResult(item.url)}
                        className="flex items-center justify-between cursor-pointer py-2.5 px-3 text-xs text-foreground hover:bg-accent rounded-xl group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-xl bg-muted text-[#22C55E] shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="truncate">
                            <div className="font-bold text-foreground group-hover:text-[#22C55E] transition-colors truncate">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {item.subtitle}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold uppercase tracking-wider bg-muted border-border text-muted-foreground rounded-md"
                          >
                            {item.type}
                          </Badge>
                          <IconArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-accent-foreground transition-colors" />
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </CommandDialog>

        {/* Floating Keyboard Shortcut Feedback Toast */}
        {shortcutToast && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-background/95 border border-[#22C55E]/40 shadow-2xl text-xs font-bold text-foreground flex items-center gap-2.5 animate-bounce backdrop-blur-md">
            <IconKeyboard className="w-4 h-4 text-[#22C55E]" />
            <span>{shortcutToast}</span>
          </div>
        )}

        <SettingsModal />
      </div>

    </Providers>

  );
}
