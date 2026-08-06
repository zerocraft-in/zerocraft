"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  IconSettings,
  IconBell,
  IconUsers,
  IconKeyboard,
  IconShieldCheck,
  IconDatabase,
  IconDeviceFloppy,
  IconCircleCheck,
  IconCrown,
  IconSparkles,
  IconLoader2,
  IconSend,
  IconKey,
  IconDownload,
  IconAdjustmentsHorizontal,
} from "@tabler/icons-react";
import {
  UserRole,
  Profile,
  fetchProfilesFromSupabase,
  updateProfileRoleInSupabase,
  ensureUserProfile,
} from "@/lib/supabase-client";
import { useCurrency } from "@/lib/currency-context";
import { CURRENCIES, CurrencyCode } from "@/lib/currency";
import { createClient } from "@/utils/supabase/client";
import { toast } from "@/components/ui/toast"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Kbd } from "@/components/ui/kbd";

const TABS = [
  { id: "general", label: "General & Theme", icon: IconAdjustmentsHorizontal },
  { id: "notifications", label: "Notifications & Push", icon: IconBell },
  { id: "account", label: "Account & User Roles", icon: IconUsers },
  { id: "shortcuts", label: "Keyboard Shortcuts", icon: IconKeyboard },
  { id: "security", label: "Security & RBAC Matrix", icon: IconShieldCheck },
  { id: "data", label: "Data Controls & Backup", icon: IconDatabase },
];

export function SettingsModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const { theme, setTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const supabase = createClient();

  // Settings State
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [accentColor, setAccentColor] = useState("emerald");
  const [autoSyncProtocol, setAutoSyncProtocol] = useState("realtime");

  // Notifications Toggles
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [bookingAlerts, setBookingAlerts] = useState(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");

  // Auth User & Profiles State
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  // Listen for hash changes to open/close modal
  useEffect(() => {
    const handleHashChange = () => {
      setOpen(window.location.hash === "#settings");
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Fetch initial data when modal opens
  useEffect(() => {
    if (!open) return;

    const savedN8n = localStorage.getItem("n8n_whatsapp_webhook_url");
    if (savedN8n) setN8nWebhookUrl(savedN8n);

    const savedSupa = localStorage.getItem("supabase_url");
    if (savedSupa) setSupabaseUrl(savedSupa);

    if (typeof window !== "undefined" && "Notification" in window) {
      setPushPermission(Notification.permission);
    }

    const loadUserData = async () => {
      setLoadingProfiles(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setCurrentUserEmail(user.email || "");
        setIsOwner(user.email === "ivd.maran@gmail.com");
        await ensureUserProfile(user);
      }

      const allProfiles = await fetchProfilesFromSupabase();
      setProfiles(allProfiles);
      setLoadingProfiles(false);
    };

    loadUserData();
  }, [open, supabase]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      history.pushState(null, "", window.location.pathname + window.location.search);
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem("n8n_whatsapp_webhook_url", n8nWebhookUrl);
    localStorage.setItem("supabase_url", supabaseUrl);
    toast.add({ title: "Preferences saved successfully!", type: "success" });
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    toast.add({ title: "Updating user role...", type: "loading" });
    try {
      await updateProfileRoleInSupabase(userId, newRole);
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, role: newRole } : p))
      );
      toast.add({ title: "Role updated successfully!", type: "success" });
    } catch (error) {
      toast.add({ title: "Failed to update role in database.", type: "error" });
    }
  };

  const requestDesktopPushPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const perm = await Notification.requestPermission();
      setPushPermission(perm);
      if (perm === "granted") {
        toast.add({ title: "Desktop Push enabled!", type: "success" });
        new Notification("Zerocraft Studio Push Enabled", {
          body: "You will now receive desktop alerts for appointments and client actions.",
        });
      } else {
        toast.add({ title: "Push permissions denied.", type: "error" });
      }
    }
  };

  const triggerTestPush = () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        toast.add({ title: "Test push triggered!", type: "success" });
        new Notification("Test Desktop Push Alert ðŸš€", {
          body: "ChatGPT-style settings desktop push notification active!",
        });
      } else {
        requestDesktopPushPermission();
      }
    }
  };

  const exportCrmBackup = () => {
    toast.add({ title: "Preparing backup...", type: "info" });
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(profiles, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `zerocraft_profiles_backup_${new Date().toISOString().split("T")[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.add({ title: "Backup downloaded!", type: "success" });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[950px] md:max-w-[1000px] p-0 h-[80vh] min-h-[500px] max-h-[750px] flex flex-col overflow-hidden bg-background border border-border shadow-2xl rounded-2xl [&>button]:right-4 [&>button]:top-4 [&>button]:w-6 [&>button]:h-6 [&>button]:rounded-full [&>button]:bg-muted [&>button]:text-muted-foreground hover:[&>button]:bg-accent hover:[&>button]:text-foreground">
        <DialogHeader className="sr-only">
          <DialogTitle>Settings & System Preferences</DialogTitle>
        </DialogHeader>

        <div className="flex h-full w-full">
          {/* Left Sidebar */}
          <div className="w-[260px] bg-muted/20 border-r border-border/40 p-3 overflow-y-auto flex flex-col">
            <div className="text-xs font-bold text-foreground px-3 py-3 mb-2 flex items-center gap-2">
              <IconSettings className="w-5 h-5 text-muted-foreground" />
              System Settings
            </div>
            <nav className="space-y-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm rounded-xl transition-all ${isActive
                        ? "bg-accent/60 text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </div>
                    {tab.id === "notifications" && pushPermission === "granted" && (
                      <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                    )}
                    {tab.id === "account" && isOwner && (
                      <IconCrown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Content */}
          <div className="flex-1 p-8 overflow-y-auto bg-background relative flex flex-col">
            {/* Top Action Bar inside Content */}
            <div className="flex flex-col gap-1 mb-8">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  {TABS.find((t) => t.id === activeTab)?.label}
                </h2>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleSaveSettings}
                    className="h-8 px-4 rounded-xl bg-[#22C55E] text-black hover:bg-[#22C55E]/90 text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-[#22C55E]/15"
                  >
                    <IconDeviceFloppy className="w-4 h-4" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Manage your preferences for this section.</p>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl w-full">
              {/* TAB 1: GENERAL & THEME */}
              {activeTab === "general" && (
                <div className="space-y-6 max-w-2xl">
                  {/* Theme & Accent Color */}
                  <div className="p-5 rounded-2xl bg-muted/30 border border-border space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">Theme & Appearance</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Dark glassmorphism tuned for Zerocraft Studio.</p>
                      </div>
                      <Select value={theme} onValueChange={(val) => val && setTheme(val)}>
                        <SelectTrigger className="w-[140px] h-8 rounded-xl text-xs bg-background">
                          <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="system" className="text-xs">System</SelectItem>
                          <SelectItem value="light" className="text-xs">Light</SelectItem>
                          <SelectItem value="dark" className="text-xs">Dark</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => setAccentColor("emerald")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${accentColor === "emerald"
                            ? "bg-[#22C55E]/15 border-[#22C55E] text-[#22C55E]"
                            : "bg-muted border-border text-muted-foreground"
                          }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" /> Emerald
                      </button>
                      <button
                        onClick={() => setAccentColor("purple")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${accentColor === "purple"
                            ? "bg-purple-500/15 border-purple-500 text-purple-300"
                            : "bg-muted border-border text-muted-foreground"
                          }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Purple
                      </button>
                      <button
                        onClick={() => setAccentColor("blue")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${accentColor === "blue"
                            ? "bg-blue-500/15 border-blue-500 text-blue-300"
                            : "bg-muted border-border text-muted-foreground"
                          }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Blue
                      </button>
                    </div>
                  </div>

                  {/* Sync Protocol */}
                  <div className="p-5 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Database Sync Protocol</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Select WebSocket realtime or polling interval.</p>
                    </div>
                    <Select value={autoSyncProtocol} onValueChange={(val) => val && setAutoSyncProtocol(val)}>
                      <SelectTrigger className="h-8 w-44 bg-background border-border text-xs rounded-xl">
                        <SelectValue placeholder="Protocol" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="realtime" className="text-xs">Realtime WebSockets</SelectItem>
                        <SelectItem value="5s" className="text-xs">5s Polling Interval</SelectItem>
                        <SelectItem value="15s" className="text-xs">15s Polling Interval</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Studio Base Currency */}
                  <div className="p-5 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Studio Base Currency</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Default display currency across all revenue KPIs.</p>
                    </div>
                    <Select value={currency} onValueChange={(val) => val && setCurrency(val as CurrencyCode)}>
                      <SelectTrigger className="h-8 w-44 bg-background border-border text-xs rounded-xl font-bold">
                        <SelectValue placeholder="Select Currency" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
                          const c = CURRENCIES[code];
                          return (
                            <SelectItem key={code} value={code} className="text-xs">
                              {c.flag} {c.name} ({c.symbol.trim()})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* TAB 2: NOTIFICATIONS & PUSH */}
              {activeTab === "notifications" && (
                <div className="space-y-6 max-w-2xl">
                  {/* Desktop Push Banner */}
                  <div className="p-5 rounded-2xl bg-muted/30 border border-border space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <IconBell className="w-4 h-4 text-[#22C55E]" /> Native Browser Desktop Push
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Receive instant OS notification banners when new bookings occur.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {pushPermission === "granted" ? (
                          <button
                            onClick={triggerTestPush}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all"
                          >
                            Test Push ðŸš€
                          </button>
                        ) : (
                          <button
                            onClick={requestDesktopPushPermission}
                            className="px-3 py-1.5 rounded-xl bg-[#22C55E] text-black text-xs font-bold hover:bg-[#22C55E]/90 transition-all"
                          >
                            Enable Alerts
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notification Channels */}
                  <div className="p-5 rounded-2xl bg-muted/30 border border-border space-y-4">
                    <h4 className="text-sm font-bold text-foreground">Alert Channel Triggers</h4>
                    <div className="space-y-4 divide-y divide-border/60">
                      <div className="pt-2 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-foreground">Passwordless Email OTP Login Alerts</div>
                          <div className="text-[11px] text-muted-foreground">Send 6-digit codes branded for in.zerocraft@gmail.com</div>
                        </div>
                        <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
                      </div>
                      <div className="pt-4 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-foreground">n8n WhatsApp Webhook Notifications</div>
                          <div className="text-[11px] text-muted-foreground">Trigger active n8n automation flow on client booking</div>
                        </div>
                        <Switch checked={whatsappAlerts} onCheckedChange={setWhatsappAlerts} />
                      </div>
                      <div className="pt-4 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-foreground">Consultation Booking Triggers</div>
                          <div className="text-[11px] text-muted-foreground">Notify owner ivd.maran@gmail.com on scheduled meetings</div>
                        </div>
                        <Switch checked={bookingAlerts} onCheckedChange={setBookingAlerts} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ACCOUNT & USER ROLES */}
              {activeTab === "account" && (
                <div className="space-y-6">
                  {/* Current User Card */}
                  <div className="p-5 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-border">
                        <AvatarImage src={`https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&fit=crop`} />
                        <AvatarFallback>ZS</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          {isOwner ? "Maran (Owner)" : currentUserEmail.split("@")[0]}
                          {isOwner && <IconCrown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{currentUserEmail}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E] text-xs font-bold px-3 py-1">
                      {isOwner ? "System Owner (Admin)" : "Registered User"}
                    </Badge>
                  </div>

                  {/* Profiles Table */}
                  <div className="p-5 rounded-2xl bg-muted/30 border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <IconUsers className="w-4 h-4 text-[#22C55E]" /> Registered Profiles in Supabase
                      </h4>
                      <span className="text-[11px] text-muted-foreground font-mono">{profiles.length} Profiles</span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-border bg-background">
                      <table className="w-full text-left text-xs text-foreground">
                        <thead className="bg-muted uppercase text-[10px] text-muted-foreground border-b border-border">
                          <tr>
                            <th className="p-3">User Profile</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Role</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {loadingProfiles ? (
                            <tr>
                              <td colSpan={4} className="p-4 text-center text-muted-foreground">
                                <IconLoader2 className="w-4 h-4 animate-spin mx-auto text-[#22C55E]" />
                              </td>
                            </tr>
                          ) : (
                            profiles.map((prof) => {
                              const isProfOwner = prof.email === "ivd.maran@gmail.com";
                              return (
                                <tr key={prof.id} className="hover:bg-muted/40 transition-colors">
                                  <td className="p-3 font-semibold flex items-center gap-2">
                                    <Avatar className="w-6 h-6">
                                      <AvatarImage src={prof.avatar_url} />
                                      <AvatarFallback>ZS</AvatarFallback>
                                    </Avatar>
                                    <span>{prof.full_name}</span>
                                    {isProfOwner && <IconCrown className="w-3 h-3 text-amber-400 fill-amber-400" />}
                                  </td>
                                  <td className="p-3 text-muted-foreground font-mono">{prof.email}</td>
                                  <td className="p-3">
                                    {isProfOwner ? (
                                      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">
                                        Owner
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[10px]">Staff</Badge>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    {isOwner ? (
                                      <Select
                                        value={prof.role}
                                        onValueChange={(val) => handleRoleChange(prof.id, val as UserRole)}
                                        disabled={isProfOwner}
                                      >
                                        <SelectTrigger className="h-7 w-28 bg-background border-border text-xs rounded-lg">
                                          <SelectValue placeholder="Role" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                          <SelectItem value="admin" className="text-xs">Admin</SelectItem>
                                          <SelectItem value="manager" className="text-xs">Manager</SelectItem>
                                          <SelectItem value="staff" className="text-xs">Staff</SelectItem>
                                          <SelectItem value="client" className="text-xs">Client</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <span className="capitalize font-bold text-foreground">{prof.role}</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: KEYBOARD SHORTCUTS */}
              {activeTab === "shortcuts" && (
                <div className="space-y-6 max-w-2xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Quick Search Modal</span>
                      <div className="flex items-center gap-1"><Kbd>âŒ˜</Kbd><Kbd>K</Kbd></div>
                    </div>
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Save Preferences</span>
                      <div className="flex items-center gap-1"><Kbd>âŒ˜</Kbd><Kbd>S</Kbd></div>
                    </div>
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Add Client / Work</span>
                      <div className="flex items-center gap-1"><Kbd>âŒ˜</Kbd><Kbd>N</Kbd></div>
                    </div>
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Close Search / Dialog</span>
                      <Kbd>Esc</Kbd>
                    </div>
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Toggle Theme</span>
                      <div className="flex items-center gap-1"><Kbd>âŒ˜</Kbd><Kbd>Shift</Kbd><Kbd>D</Kbd></div>
                    </div>
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Refresh Supabase DB</span>
                      <div className="flex items-center gap-1"><Kbd>âŒ˜</Kbd><Kbd>R</Kbd></div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: SECURITY & RBAC MATRIX */}
              {activeTab === "security" && (
                <div className="space-y-6 max-w-2xl">
                  <div className="p-5 rounded-2xl bg-muted/30 border border-border space-y-3">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <IconSend className="w-4 h-4 text-purple-400" /> n8n WhatsApp Automation Webhook URL
                    </h4>
                    <input
                      type="url"
                      placeholder="https://your-n8n-instance.com/webhook/whatsapp"
                      value={n8nWebhookUrl}
                      onChange={(e) => setN8nWebhookUrl(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="p-5 rounded-2xl bg-muted/30 border border-border space-y-3">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <IconKey className="w-4 h-4 text-[#22C55E]" /> Supabase Backend Connection URL
                    </h4>
                    <input
                      type="text"
                      placeholder="https://jamyqssytdzbiiahtmsq.supabase.co"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-background border border-border text-xs text-foreground font-mono focus:outline-none focus:border-[#22C55E]"
                    />
                  </div>

                  <div className="p-5 rounded-2xl bg-muted/30 border border-border space-y-3">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <IconShieldCheck className="w-4 h-4 text-blue-400" /> Role-Based Access Matrix (RBAC)
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-border bg-background">
                      <table className="w-full text-left text-xs text-foreground">
                        <thead className="bg-muted uppercase text-[10px] text-muted-foreground border-b border-border">
                          <tr>
                            <th className="p-3">Role</th>
                            <th className="p-3">Dashboard</th>
                            <th className="p-3">CRM</th>
                            <th className="p-3">Settings</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          <tr>
                            <td className="p-3 font-bold text-amber-400 flex items-center gap-1">
                              <IconCrown className="w-3.5 h-3.5" /> Admin
                            </td>
                            <td className="p-3 text-emerald-400 font-semibold">Full Access</td>
                            <td className="p-3 text-emerald-400 font-semibold">Full CRUD</td>
                            <td className="p-3 text-emerald-400 font-semibold">Manage All</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-bold text-blue-400">Manager</td>
                            <td className="p-3 text-emerald-400 font-semibold">Full Access</td>
                            <td className="p-3 text-emerald-400 font-semibold">Full CRUD</td>
                            <td className="p-3 text-red-400">Restricted</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-bold text-purple-400">Staff</td>
                            <td className="p-3 text-emerald-400 font-semibold">View Only</td>
                            <td className="p-3 text-muted-foreground">Read Only</td>
                            <td className="p-3 text-red-400">Restricted</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: DATA CONTROLS & BACKUP */}
              {activeTab === "data" && (
                <div className="space-y-6 max-w-2xl">
                  <div className="p-5 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Export Profiles & Database Backup</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Download full JSON snapshot of user profiles.</p>
                    </div>
                    <button
                      onClick={exportCrmBackup}
                      className="px-4 py-2 rounded-xl bg-background border border-border text-foreground text-xs font-bold hover:bg-accent flex items-center gap-2 transition-all"
                    >
                      <IconDownload className="w-4 h-4 text-[#22C55E]" /> Export Backup
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
