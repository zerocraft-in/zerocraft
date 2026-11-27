"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  ClipboardList,
  Eye,
  Globe2,
  Moon,
  Palette,
  Plug,
  Save,
  Send,
  Sparkles,
  Sun,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Button } from "@zerocraft/ui/components/button";
import { Input } from "@zerocraft/ui/components/input";
import { Checkbox } from "@zerocraft/ui/components/checkbox";
import {
  SUPPORTED_FONTS,
  ACCENT_PRESETS,
  getFontFamilyStack,
  ensureGoogleFontsLoaded,
  type PublicAppearance,
} from "@/lib/studio-appearance";
import { useStudioAppearance } from "@/components/providers/studio-appearance-provider";
import { StudioLoadTransition } from "@/components/studio-loading";
import { studioToast } from "@/lib/studio-toast";

export type SettingsSection =
  | "workspace-profile"
  | "team"
  | "brand"
  | "notifications"
  | "integrations"
  | "audit-log";

type Member = {
  id: string;
  initials: string;
  name: string;
  email?: string;
  role: string;
  status: "Active" | "Invited" | "Inactive";
};

type AuditItem = {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
};

type Data = {
  members: Member[];
  invites: Member[];
  notifications: { assigned: boolean; approval: boolean; digest: boolean };
  workspace: { name: string; currency: string; timezone: string };
  brand: {
    name: string;
    accentColor: string;
    logoUrl: string;
    faviconUrl: string;
    fontFamily: string;
    themeMode: string;
  };
  integrations: {
    provider: string;
    display_name: string;
    status: "connected" | "error";
    enabled: boolean;
    last_verified_at: string | null;
  }[];
  currentRole: string;
  permissions: Record<string, boolean>;
  audit: AuditItem[];
  canInvite: boolean;
};

const nav = [
  ["workspace-profile", "Workspace profile", UserRound],
  ["team", "Team & roles", UsersRound],
  ["brand", "Appearance", Palette],
  ["notifications", "Notifications", Bell],
  ["integrations", "Integrations", Plug],
  ["audit-log", "Audit log", ClipboardList],
] as const;

const glass = "border-white/[.1] bg-white/[.06] shadow-none backdrop-blur-[28px]";

const empty: Data = {
  members: [],
  invites: [],
  notifications: { assigned: true, approval: true, digest: false },
  workspace: { name: "ZeroCraft Studio", currency: "USD", timezone: "Asia/Kolkata" },
  brand: {
    name: "ZeroCraft Studio",
    accentColor: "#ff6a2b",
    logoUrl: "",
    faviconUrl: "",
    fontFamily: "Inter",
    themeMode: "dark",
  },
  integrations: [],
  currentRole: "Member",
  permissions: {},
  audit: [],
  canInvite: false,
};

const label = (section: SettingsSection) =>
  nav.find(([key]) => key === section)?.[1] ?? "Settings";

const initials = (value: string) =>
  value
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

async function patchSettings(values: Record<string, unknown>) {
  const response = await fetch("/api/studio/settings", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(values),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Could not save settings.");
  return payload;
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${glass} mt-5 rounded-[32px] p-6`}>
      <div className="mb-5">
        <h2 className="text-xl font-medium">{title}</h2>
        {description && <p className="mt-1 text-sm text-zinc-400">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Navigation({ section }: { section: SettingsSection }) {
  return (
    <aside
      aria-label="Settings sections"
      className={`${glass} sticky top-4 self-start flex w-[240px] shrink-0 flex-col gap-1 rounded-[36px] p-4 max-lg:static max-lg:w-full`}
    >
      <div className="px-1.5 pb-3 text-lg font-medium">Settings</div>
      {nav.map(([key, text, Icon]) => (
        <Link
          key={key}
          href={`/studio/settings/${key}`}
          aria-current={key === section ? "page" : undefined}
          className={`flex h-12 items-center gap-3 rounded-[20px] px-3.5 text-[15px] font-medium transition-colors ${
            key === section
              ? "bg-white text-[#0a0a0b]"
              : "text-zinc-300 hover:bg-white/[.06]"
          }`}
        >
          <Icon size={18} />
          {text}
        </Link>
      ))}
    </aside>
  );
}

function Workspace({ data }: { data: Data }) {
  const router = useRouter();
  const { appearance, broadcastAppearance } = useStudioAppearance();
  const [name, setName] = useState(data.workspace.name || appearance.name);
  const [currency, setCurrency] = useState(data.workspace.currency);
  const [timezone, setTimezone] = useState(data.workspace.timezone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      await patchSettings({ name, currency, timezone });
      const updated: PublicAppearance = {
        ...appearance,
        name: name.trim() || appearance.name,
      };
      broadcastAppearance(updated);
      studioToast.success(
        "Workspace identity saved",
        "Changes are applied across the dashboard.",
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save workspace settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Panel
        title="Workspace identity"
        description="Manage the identity shown across your studio."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-zinc-400">
            Workspace name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              className="mt-1.5 h-11 w-full rounded-[18px] border border-white/[.14] bg-white/[.06] px-3.5 text-white outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            disabled={saving || !name.trim() || !data.permissions["settings.manage"]}
            onClick={() => void save()}
            className="rounded-full"
          >
            <Save />
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
        {!data.permissions["settings.manage"] && (
          <p className="mt-3 text-right text-sm text-zinc-500">
            Your role cannot manage workspace settings.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-right text-sm text-red-200">
            {error}
          </p>
        )}
      </Panel>
      <Panel
        title="Locale & billing"
        description="Defaults for reports and project budgets."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-zinc-400">
            Currency
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-[18px] border border-white/[.14] bg-[#252528] px-3.5 text-white"
            >
              <option value="USD">USD ($)</option>
              <option value="INR">INR (₹)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </label>
          <label className="text-sm text-zinc-400">
            Timezone
            <select
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-[18px] border border-white/[.14] bg-[#252528] px-3.5 text-white"
            >
              <option>Asia/Kolkata</option>
              <option>UTC</option>
              <option>America/New_York</option>
            </select>
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            disabled={saving || !data.permissions["settings.manage"]}
            onClick={() => void save()}
            className="rounded-full"
          >
            <Save />
            {saving ? "Saving…" : "Save locale"}
          </Button>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-right text-sm text-red-200">
            {error}
          </p>
        )}
      </Panel>
    </>
  );
}

function Team({ data }: { data: Data }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [members, setMembers] = useState([...data.members, ...data.invites]);

  async function invite() {
    try {
      const response = await fetch("/api/studio/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const payload = await response.json();
      if (!response.ok) {
        studioToast.error(
          "Could not send invitation",
          payload.error ?? "Try again or contact a workspace administrator.",
        );
        return;
      }
      setMembers((current) => [
        ...current,
        {
          id: payload.invite.id,
          initials: initials(email),
          name: email,
          email,
          role: role[0].toUpperCase() + role.slice(1),
          status: "Invited",
        },
      ]);
      setEmail("");
      studioToast.success("Invitation created", `An invite was sent to ${email}.`);
    } catch (caught) {
      studioToast.error(
        "Could not send invitation",
        caught instanceof Error ? caught.message : "Try again.",
      );
    }
  }

  return (
    <>
      <Panel
        title="Invite a team member"
        description="Give each collaborator only the access they need."
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[220px] flex-1 text-sm text-zinc-400">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="mt-1.5 h-11 w-full rounded-[18px] border border-white/[.14] bg-white/[.06] px-3.5 text-white outline-none"
            />
          </label>
          <label className="w-[180px] text-sm text-zinc-400">
            Role
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-[18px] border border-white/[.14] bg-[#252528] px-3.5 text-white"
            >
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <Button
            disabled={!data.canInvite || !email}
            onClick={invite}
            className="h-11 rounded-full"
          >
            <Send />
            Send invite
          </Button>
        </div>
        {!data.canInvite && (
          <p className="mt-3 text-sm text-zinc-500">
            Your role cannot invite members. Ask a workspace admin for team management access.
          </p>
        )}
      </Panel>
      <Panel
        title={`Members (${members.length})`}
        description="Workspace membership is separate from account access."
      >
        <div className="divide-y divide-white/[.08]">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0"
            >
              <span className="grid size-10 place-items-center rounded-full border border-white/20 bg-[#3a3a40] text-sm font-semibold">
                {member.initials}
              </span>
              <div className="min-w-[180px] flex-1">
                <p>{member.name}</p>
                <p className="text-sm text-zinc-400">{member.email ?? member.role}</p>
              </div>
              <span className="rounded-full border border-white/20 px-3 py-1 text-xs">
                {member.role}
              </span>
              <span className="rounded-full border border-white/20 px-3 py-1 text-xs">
                {member.status}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function Brand({ data }: { data: Data }) {
  const router = useRouter();
  const { appearance, broadcastAppearance } = useStudioAppearance();

  const [name, setName] = useState(data.brand.name || appearance.name);
  const [accentColor, setAccentColor] = useState(data.brand.accentColor || appearance.accentColor);
  const [logoUrl, setLogoUrl] = useState(data.brand.logoUrl || appearance.logoUrl);
  const [faviconUrl, setFaviconUrl] = useState(data.brand.faviconUrl || appearance.faviconUrl);
  const [fontFamily, setFontFamily] = useState<PublicAppearance["fontFamily"]>(
    (data.brand.fontFamily as PublicAppearance["fontFamily"]) || appearance.fontFamily
  );
  const [themeMode, setThemeMode] = useState<PublicAppearance["themeMode"]>(
    (data.brand.themeMode as PublicAppearance["themeMode"]) || appearance.themeMode
  );
  const [previewTheme, setPreviewTheme] = useState<"auto" | "dark" | "light">("auto");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const accent = /^#[0-9a-f]{6}$/i.test(accentColor) ? accentColor.toLowerCase() : "#ff6a2b";
  const fontStack = getFontFamilyStack(fontFamily);

  // Determine whether the preview card renders in dark or light styling
  const isPreviewDark =
    previewTheme === "auto"
      ? themeMode !== "light"
      : previewTheme === "dark";

  async function save() {
    setSaving(true);
    setError("");
    try {
      await patchSettings({ brandName: name, accentColor, logoUrl, faviconUrl, fontFamily, themeMode });

      const nextAppearance: PublicAppearance = {
        name: name.trim() || "Zerocraft Studio",
        accentColor: accent,
        logoUrl: logoUrl.trim(),
        faviconUrl: faviconUrl.trim(),
        fontFamily,
        themeMode,
      };

      // Broadcast immediately to DOM, context, and other tabs
      broadcastAppearance(nextAppearance);
      studioToast.success(
        "Appearance saved",
        "The dashboard has been updated.",
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save appearance settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Panel
        title="Appearance system"
        description="One responsive visual system for your dashboard, workspace shell, and public studio."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label className="text-sm text-zinc-400">
            Display name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              placeholder="e.g. Zerocraft Studio"
              className="mt-1.5 h-11 w-full rounded-[18px] border border-white/[.14] bg-white/[.06] px-3.5 text-white outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            />
          </label>

          <div>
            <label className="block text-sm text-zinc-400">
              Accent color
              <div className="mt-1.5 flex h-11 items-center gap-3 rounded-[18px] border border-white/[.14] bg-white/[.06] px-3.5">
                <input
                  type="color"
                  aria-label="Appearance accent color"
                  value={accent}
                  onChange={(event) => setAccentColor(event.target.value)}
                  className="size-7 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                />
                <span className="font-mono text-sm tracking-wide text-zinc-200 uppercase">
                  {accent}
                </span>
                <span
                  className="ml-auto size-4 rounded-full border border-white/20 shadow-sm"
                  style={{ backgroundColor: accent }}
                />
              </div>
            </label>
            {/* Quick Accent Swatches */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] text-zinc-500">Presets:</span>
              {ACCENT_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.hex}
                  onClick={() => setAccentColor(preset.hex)}
                  title={preset.name}
                  className={`group relative grid size-6 place-items-center rounded-full border transition-all ${
                    accent.toLowerCase() === preset.hex.toLowerCase()
                      ? "border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,.4)]"
                      : "border-white/20 hover:scale-105"
                  }`}
                  style={{ backgroundColor: preset.hex }}
                >
                  {accent.toLowerCase() === preset.hex.toLowerCase() && (
                    <Check size={11} className="text-black drop-shadow" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <label className="text-sm text-zinc-400">
            Logo URL
            <input
              value={logoUrl}
              onChange={(event) => setLogoUrl(event.target.value)}
              placeholder="https://media.example.com/logo.svg"
              className="mt-1.5 h-11 w-full rounded-[18px] border border-white/[.14] bg-white/[.06] px-3.5 text-white outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            />
          </label>

          <label className="text-sm text-zinc-400">
            Favicon URL
            <input
              value={faviconUrl}
              onChange={(event) => setFaviconUrl(event.target.value)}
              placeholder="https://media.example.com/favicon.png"
              className="mt-1.5 h-11 w-full rounded-[18px] border border-white/[.14] bg-white/[.06] px-3.5 text-white outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            />
          </label>

          <label className="text-sm text-zinc-400">
            Interface font
            <select
              value={fontFamily}
              onChange={(event) => {
                const nextFont = event.target.value as PublicAppearance["fontFamily"];
                setFontFamily(nextFont);
                ensureGoogleFontsLoaded();
              }}
              className="mt-1.5 h-11 w-full rounded-[18px] border border-white/[.14] bg-[#252528] px-3.5 text-white outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            >
              {SUPPORTED_FONTS.map((font) => (
                <option key={font.name} value={font.name}>
                  {font.name} — {font.category}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-zinc-400">
            Theme preference
            <select
              value={themeMode}
              onChange={(event) => {
                const nextTheme = event.target.value as PublicAppearance["themeMode"];
                setThemeMode(nextTheme);
              }}
              className="mt-1.5 h-11 w-full rounded-[18px] border border-white/[.14] bg-[#252528] px-3.5 text-white outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            >
              <option value="dark">Dark — Obsidian & Glass</option>
              <option value="light">Light — Minimal Daylight</option>
              <option value="system">System — Sync with OS</option>
            </select>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/[.08] pt-5">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Sparkles size={14} className="text-orange-400" />
            <span>Changes persist immediately and broadcast to all open dashboard views.</span>
          </div>
          <Button
            disabled={saving || !name.trim() || !data.permissions["settings.manage"]}
            onClick={() => void save()}
            className="rounded-full px-6"
            style={{ backgroundColor: accent, color: "#fff" }}
          >
            <Save size={16} />
            {saving ? "Saving…" : "Save appearance"}
          </Button>
        </div>

        {!data.permissions["settings.manage"] && (
          <p className="mt-3 text-right text-sm text-zinc-500">
            Your role cannot manage workspace settings.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-right text-sm text-red-200"
          >
            {error}
          </p>
        )}
      </Panel>

      {/* Sleek, Unified Live Workspace Preview Card */}
      <section
        aria-label="Live studio preview"
        className={`relative mt-6 overflow-hidden rounded-[28px] border transition-all duration-300 shadow-xl backdrop-blur-2xl ${
          isPreviewDark
            ? "border-white/[.12] bg-[#0c0d10]/95 text-zinc-100"
            : "border-zinc-200/90 bg-white/95 text-zinc-900 shadow-md"
        }`}
        style={{
          fontFamily: fontStack,
          ["--preview-accent" as string]: accent,
        }}
      >
        {/* Ambient Accent Radial Glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full opacity-30 blur-3xl transition-all duration-500"
          style={{ backgroundColor: accent }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-16 -bottom-20 size-72 rounded-full opacity-20 blur-3xl transition-all duration-500"
          style={{ backgroundColor: accent }}
        />

        <div className="relative p-6 sm:p-7">
          {/* Card Top: Workspace Identity + Live Mode & Font Controls */}
          <div
            className={`flex flex-wrap items-center justify-between gap-3 pb-5 border-b ${
              isPreviewDark ? "border-white/[.08]" : "border-zinc-200/80"
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border shadow-xs"
                style={{
                  borderColor: `${accent}40`,
                  background: `linear-gradient(135deg, ${accent}25, ${accent}08)`,
                }}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="size-full object-contain p-1" />
                ) : (
                  <span className="text-base font-bold" style={{ color: accent }}>
                    {name.trim().slice(0, 1).toUpperCase() || "Z"}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3
                    className={`truncate text-sm font-semibold ${
                      isPreviewDark ? "text-white" : "text-zinc-900"
                    }`}
                  >
                    {name.trim() || "Workspace Name"}
                  </h3>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: `${accent}18`,
                      color: accent,
                      border: `1px solid ${accent}33`,
                    }}
                  >
                    <span
                      className="size-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: accent }}
                    />
                    Live preview
                  </span>
                </div>
                <p
                  className={`text-[11px] ${
                    isPreviewDark ? "text-zinc-400" : "text-zinc-500"
                  }`}
                >
                  Studio Theme & Typography Specimen
                </p>
              </div>
            </div>

            {/* Badges & Theme Switcher */}
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`rounded-full border px-2.5 py-1 font-mono text-[11px] ${
                  isPreviewDark
                    ? "border-white/10 bg-white/[.04] text-zinc-300"
                    : "border-zinc-200 bg-zinc-100 text-zinc-700"
                }`}
              >
                Aa {fontFamily}
              </span>

              <div
                className={`flex items-center rounded-full border p-0.5 ${
                  isPreviewDark
                    ? "border-white/10 bg-white/[.04]"
                    : "border-zinc-200 bg-zinc-100"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setPreviewTheme("dark")}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    isPreviewDark
                      ? "bg-white text-black shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  <Moon size={11} />
                  Dark
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTheme("light")}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    !isPreviewDark
                      ? "bg-black text-white shadow-xs"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Sun size={11} />
                  Light
                </button>
              </div>
            </div>
          </div>

          {/* Hero Statement */}
          <div className="py-5">
            <h4
              className={`text-xl sm:text-2xl font-light tracking-[-.02em] ${
                isPreviewDark ? "text-white" : "text-zinc-900"
              }`}
            >
              Make every creative move{" "}
              <span style={{ color: accent }} className="font-medium">
                clear & measurable.
              </span>
            </h4>
            <p
              className={`mt-1.5 text-xs sm:text-sm leading-relaxed ${
                isPreviewDark ? "text-zinc-400" : "text-zinc-600"
              }`}
            >
              Unified operations across client pipeline, project deliverables, and real-time workload for {name.trim() || "Zerocraft"}.
            </p>
          </div>

          {/* Single Unified Metrics Bar (NO nested sub-cards!) */}
          <div
            className={`grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x rounded-2xl border p-4 ${
              isPreviewDark
                ? "border-white/[.08] bg-white/[.03] divide-white/[.08]"
                : "border-zinc-200/80 bg-zinc-50/80 divide-zinc-200/80 shadow-xs"
            }`}
          >
            <div className="px-3 py-2 first:pt-0 sm:first:pl-0 sm:py-0">
              <span
                className={`text-[11px] font-medium ${
                  isPreviewDark ? "text-zinc-400" : "text-zinc-500"
                }`}
              >
                Lead Pipeline
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span
                  className={`text-xl font-light tracking-tight ${
                    isPreviewDark ? "text-white" : "text-zinc-900"
                  }`}
                >
                  $184,200
                </span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                  style={{ backgroundColor: `${accent}18`, color: accent }}
                >
                  +24%
                </span>
              </div>
              <p
                className={`mt-0.5 text-[10px] ${
                  isPreviewDark ? "text-zinc-500" : "text-zinc-400"
                }`}
              >
                14 active opportunities
              </p>
            </div>

            <div className="px-3 py-2 sm:py-0">
              <span
                className={`text-[11px] font-medium ${
                  isPreviewDark ? "text-zinc-400" : "text-zinc-500"
                }`}
              >
                Active Projects
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span
                  className={`text-xl font-light tracking-tight ${
                    isPreviewDark ? "text-white" : "text-zinc-900"
                  }`}
                >
                  8 in flight
                </span>
                <span className="text-[10px] font-medium" style={{ color: accent }}>
                  75%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: "75%", backgroundColor: accent }}
                />
              </div>
            </div>

            <div className="px-3 py-2 last:pb-0 sm:last:pr-0 sm:py-0">
              <span
                className={`text-[11px] font-medium ${
                  isPreviewDark ? "text-zinc-400" : "text-zinc-500"
                }`}
              >
                Media Assets
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span
                  className={`text-xl font-light tracking-tight ${
                    isPreviewDark ? "text-white" : "text-zinc-900"
                  }`}
                >
                  1.4 GB
                </span>
                <span
                  className={`text-[10px] ${
                    isPreviewDark ? "text-zinc-400" : "text-zinc-500"
                  }`}
                >
                  98 assets
                </span>
              </div>
              <p
                className={`mt-0.5 text-[10px] ${
                  isPreviewDark ? "text-zinc-500" : "text-zinc-400"
                }`}
              >
                Cloudflare R2 active
              </p>
            </div>
          </div>

          {/* Bottom Bar: Action Button + Font Specimen */}
          <div
            className={`mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t ${
              isPreviewDark ? "border-white/[.08]" : "border-zinc-200/80"
            }`}
          >
            <p
              className={`truncate text-xs ${
                isPreviewDark ? "text-zinc-400" : "text-zinc-600"
              }`}
            >
              <span className="font-mono text-[11px] text-zinc-500 mr-2">Specimen:</span>
              The quick brown fox jumps over the lazy dog • 0123456789
            </p>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center rounded-full px-3.5 py-1 text-xs font-medium text-white shadow-xs"
                style={{
                  backgroundColor: accent,
                  boxShadow: `0 2px 10px -1px ${accent}66`,
                }}
              >
                + New project
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Notifications({ data }: { data: Data }) {
  const [values, setValues] = useState(data.notifications);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function updatePreference(key: keyof typeof values, targetValue: boolean) {
    if (values[key] === targetValue) return;
    const previous = values;
    const next = { ...values, [key]: targetValue };
    setValues(next);
    setSaving(true);
    setError("");
    try {
      await patchSettings(next);
      studioToast.success("Notification preferences saved");
    } catch (caught) {
      setValues(previous);
      setError(caught instanceof Error ? caught.message : "Could not save preferences.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel
      title="Notification preferences"
      description="Choose which workspace events reach your account."
    >
      <div className="space-y-3">
        {(
          [
            ["assigned", "A lead is assigned to me", "Get notified when ownership changes."],
            ["approval", "A deliverable needs approval", "Know when a review is waiting on you."],
            ["digest", "Weekly digest is ready", "Receive a weekly summary."],
          ] as const
        ).map(([key, title, description]) => {
          const isChecked = values[key];
          return (
            <div
              key={key}
              onClick={() => {
                if (!saving) void updatePreference(key, !isChecked);
              }}
              className={`flex items-start gap-4 rounded-2xl border p-4.5 transition-all ${
                saving ? "cursor-wait opacity-70" : "cursor-pointer hover:bg-white/[.04]"
              } ${
                isChecked
                  ? "border-white/[.14] bg-white/[.04]"
                  : "border-white/[.08] bg-transparent"
              }`}
            >
              <div
                className="pt-0.5 shrink-0"
                onClick={(event) => event.stopPropagation()}
              >
                <Checkbox
                  id={`pref-${key}`}
                  checked={isChecked}
                  disabled={saving}
                  onCheckedChange={(checked) => {
                    void updatePreference(key, Boolean(checked));
                  }}
                  className="size-5 rounded-md border-white/20 data-checked:border-primary data-checked:bg-primary data-checked:text-white"
                />
              </div>
              <label
                htmlFor={`pref-${key}`}
                className="flex-1 cursor-pointer select-none"
              >
                <span className="block text-sm font-medium text-foreground">{title}</span>
                <span className="mt-1 block text-sm text-zinc-400">{description}</span>
              </label>
            </div>
          );
        })}
      </div>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2 text-sm text-red-200"
        >
          {error}
        </p>
      )}
    </Panel>
  );
}

function Integrations({ data }: { data: Data }) {
  const [integrations, setIntegrations] = useState(data.integrations);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function manage(provider: string, action: "verify" | "disconnect") {
    setBusy(`${provider}:${action}`);
    setError("");
    try {
      if (action === "verify") {
        const providerName =
          provider === "cloudflare_r2" ? "Cloudflare R2" : provider;
        await studioToast.promise(
          (async () => {
            const response = await fetch(
              `/api/studio/integrations/${provider}/manage`,
              {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ action }),
              },
            );
            const payload = await response.json();
            if (!response.ok) {
              throw new Error(
                payload.error ?? "Could not test the integration connection.",
              );
            }
            setIntegrations((current) =>
              current.map((item) =>
                item.provider === provider
                  ? {
                      ...item,
                      enabled: true,
                      status: "connected",
                      last_verified_at: new Date().toISOString(),
                    }
                  : item,
              ),
            );
            return providerName;
          })(),
          {
            loading: `Testing ${providerName}…`,
            success: (name) => `${name} connection verified`,
            error: (caught) =>
              `Connection test failed: ${
                caught instanceof Error
                  ? caught.message
                  : "Could not test the integration connection."
              }`,
          },
        );
      } else {
        const response = await fetch(
          `/api/studio/integrations/${provider}/manage`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action }),
          },
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not update integration.");
        }
        setIntegrations((current) =>
          current.map((item) =>
            item.provider === provider
              ? {
                  ...item,
                  enabled: false,
                  status: "error",
                  last_verified_at: null,
                }
              : item,
          ),
        );
        studioToast.success(
          "OAuth disconnected",
          "Server storage credentials remain unchanged.",
        );
      }
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Could not update integration.";
      if (action === "disconnect") setError(message);
    } finally {
      setBusy("");
    }
  }

  if (!data.permissions["integrations.manage"]) {
    return (
      <Panel
        title="Connected services"
        description="Integration status is restricted to workspace administrators."
      >
        <p className="text-sm text-zinc-400">
          Your role does not have permission to view integration status.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Connected services"
      description="Manage R2 storage through Cloudflare OAuth and server-side object credentials. Other services use OAuth. Credentials never belong in the browser."
    >
      {integrations.length ? (
        <div className="divide-y divide-white/[.08]">
          {integrations.map((integration) => {
            const status = !integration.enabled
              ? "Not connected"
              : integration.status === "connected"
              ? "Connected"
              : "Needs attention";
            const actionBusy = busy.startsWith(`${integration.provider}:`);
            return (
              <div
                key={integration.provider}
                className="flex flex-wrap items-center gap-3 py-5 first:pt-0 last:pb-0"
              >
                <span className="grid size-11 place-items-center rounded-2xl border border-white/[.12] bg-white/[.05]">
                  <Globe2 size={18} />
                </span>
                <div className="min-w-[200px] flex-1">
                  <p>{integration.display_name}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {integration.provider === "cloudflare_r2"
                      ? "OAuth manages Cloudflare access; S3 credentials power media CRUD."
                      : integration.last_verified_at
                      ? `Last checked ${new Date(integration.last_verified_at).toLocaleString()}`
                      : "OAuth connection not configured"}
                  </p>
                </div>
                <span className="rounded-full border border-white/20 px-3 py-1 text-xs text-zinc-300">
                  {status}
                </span>
                <Button
                  variant="outline"
                  disabled={actionBusy}
                  className="rounded-full border-white/15"
                  onClick={() => {
                    window.location.href = `/api/studio/integrations/${integration.provider}/connect`;
                  }}
                >
                  {integration.enabled ? "Reconnect" : "Connect"}
                </Button>
                {integration.provider === "cloudflare_r2" && (
                  <Button
                    variant="outline"
                    disabled={actionBusy}
                    className="rounded-full border-white/15"
                    onClick={() => void manage(integration.provider, "verify")}
                  >
                    {busy === `${integration.provider}:verify` ? "Checking…" : "Test connection"}
                  </Button>
                )}
                {integration.enabled && (
                  <Button
                    variant="ghost"
                    disabled={actionBusy}
                    className="rounded-full text-zinc-400"
                    onClick={() => void manage(integration.provider, "disconnect")}
                  >
                    Disconnect OAuth
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-zinc-400">No integrations are registered for this workspace.</p>
      )}
      {error && <p role="alert" className="mt-5 text-sm text-red-200">{error}</p>}
    </Panel>
  );
}

function AuditLog({ data }: { data: Data }) {
  const [query, setQuery] = useState("");
  const [entity, setEntity] = useState("all");
  const entities = Array.from(new Set(data.audit.map((item) => item.entity_type))).sort();
  const filtered = data.audit.filter((item) => {
    const haystack = `${item.action} ${item.entity_type}`.toLowerCase();
    return (
      (entity === "all" || item.entity_type === entity) &&
      haystack.includes(query.trim().toLowerCase())
    );
  });

  return (
    <Panel
      title="Audit log"
      description="Search and filter workspace events for accountability and troubleshooting."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search events"
          className="h-10 min-w-[220px] flex-1 rounded-full border-white/[.14] bg-white/[.05]"
        />
        <select
          value={entity}
          onChange={(event) => setEntity(event.target.value)}
          className="h-10 rounded-full border border-white/[.14] bg-[#252528] px-3 text-sm text-white"
        >
          <option value="all">All entities</option>
          {entities.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <div className="divide-y divide-white/[.08]">
        {filtered.length ? (
          filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0"
            >
              <span className="grid size-9 place-items-center rounded-full border border-white/15 bg-white/[.04]">
                <ClipboardList size={15} />
              </span>
              <div className="flex-1">
                <p>{item.action}</p>
                <p className="text-sm text-zinc-400">{item.entity_type}</p>
              </div>
              <time className="text-xs text-zinc-500">
                {new Date(item.created_at).toLocaleString()}
              </time>
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-400">No audit events match this filter.</p>
        )}
      </div>
      <p className="mt-4 text-xs text-zinc-500">
        Showing {filtered.length} of {data.audit.length} events.
      </p>
    </Panel>
  );
}

export function SettingsSection({ section }: { section: SettingsSection }) {
  const { appearance } = useStudioAppearance();
  const [data, setData] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/studio/settings", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error);
        setData({
          ...empty,
          ...payload,
          workspace: { ...empty.workspace, ...payload.workspace },
          brand: { ...empty.brand, ...payload.brand },
          integrations: payload.integrations ?? [],
          members: payload.members ?? [],
          invites: payload.invites ?? [],
          audit: payload.audit ?? [],
        });
      })
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : "Could not load settings.")
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative min-h-full pb-20 pt-2">
      <div className="relative z-10 flex min-w-0 flex-1 flex-col lg:flex-row items-start gap-6">
        <Navigation section={section} />
        <div className="relative min-w-0 flex-1 w-full">
          <div className="flex items-center gap-2 text-[15px] text-zinc-400">
            <Link href="/studio" className="hover:text-white transition-colors">
              {appearance.name || data.brand.name}
            </Link>
            <span>/</span>
            <span>Settings</span>
            <span>/</span>
            <span className="text-foreground font-medium">{label(section)}</span>
          </div>
          <h1 className="mt-6 text-[50px] font-light leading-none tracking-[-.03em] max-md:text-[38px]">
            {label(section)}
          </h1>
          <p className="mt-2 max-w-2xl text-base text-zinc-400">
            Manage the identity, defaults, and workflows that keep your workspace moving.
          </p>
          <StudioLoadTransition
            loading={loading}
            label="Loading live settings…"
            loadingClassName="mt-5 min-h-20 justify-start"
          >
          {!error && (
            <>
              {section === "workspace-profile" && <Workspace data={data} />}
              {section === "team" && <Team data={data} />}
              {section === "brand" && <Brand data={data} />}
              {section === "notifications" && <Notifications data={data} />}
              {section === "integrations" && <Integrations data={data} />}
              {section === "audit-log" && <AuditLog data={data} />}
            </>
          )}
          </StudioLoadTransition>
          {error && (
            <p
              role="alert"
              className="mt-5 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100"
            >
              {error}
            </p>
          )}
        </div>
        <aside
          aria-label={`Role permissions: ${data.currentRole}`}
          className={`${glass} sticky top-4 self-start h-max w-full 2xl:w-[260px] shrink-0 rounded-[36px] p-5`}
        >
          <p className="text-sm text-zinc-400">Permissions for</p>
          <h2 className="mt-1 text-2xl font-light">{data.currentRole}</h2>
          <div className="mt-5 space-y-2">
            {[
              ["Workspace", "dashboard.read"],
              ["Pipeline", "leads.read"],
              ["Projects", "projects.read"],
              ["Analytics", "analytics.read"],
              ["Content", "content.read"],
              ["Media", "media.read"],
              ["Settings", "settings.manage"],
            ].map(([text, key]) => (
              <div
                key={text}
                className="flex items-center justify-between border-t border-white/[.08] pt-2 text-sm"
              >
                <span>{text}</span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    data.permissions[key]
                      ? "border-white bg-white text-[#0a0a0b]"
                      : "border-white/20 text-zinc-400"
                  }`}
                >
                  {data.permissions[key] ? "Allowed" : "No access"}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
