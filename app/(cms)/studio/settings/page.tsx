"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  IconActivity,
  IconArrowUpRight,
  IconBell,
  IconBolt,
  IconBrain,
  IconBrush,
  IconCheck,
  IconChevronRight,
  IconCloud,
  IconCode,
  IconDatabase,
  IconExternalLink,
  IconKey,
  IconLayoutDashboard,
  IconLock,
  IconPalette,
  IconPlugConnected,
  IconRocket,
  IconShieldCheck,
  IconSparkles,
  IconUsers,
  IconWorld,
} from "@tabler/icons-react";
import { AppearanceSettings } from "@/components/studio/appearance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

function StatusBadge({
  children,
  missing = false,
}: {
  children: ReactNode;
  missing?: boolean;
}) {
  return (
    <Badge
      variant="outline"
      className={
        missing
          ? "gap-1.5 border-amber-400/30 text-amber-600 dark:text-amber-300"
          : "gap-1.5 border-emerald-400/30 text-emerald-700 dark:text-emerald-300"
      }
    >
      <span
        className={`size-1.5 rounded-full ${missing ? "bg-amber-400" : "bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,.7)]"}`}
      />
      {children}
    </Badge>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-emerald-700/70 dark:text-emerald-300/65">
          {eyebrow}
        </p>
        <h2 className="font-mono text-lg font-semibold tracking-[-0.04em] text-foreground">
          {title}
        </h2>
        <p className="max-w-2xl text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

function SettingRow({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className={`flex min-w-0 items-center gap-3 rounded-xl border p-3.5`}>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border/70 bg-muted/40 text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <strong className="block truncate text-sm font-medium">{title}</strong>
        <small className="block text-xs leading-5 text-muted-foreground">
          {description}
        </small>
      </span>
      {action}
    </div>
  );
}

export default function StudioSettingsPage() {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [automationsEnabled, setAutomationsEnabled] = useState(false);
  const [reAuthEnabled, setReAuthEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  const sections = [
    ["general", "General", IconLayoutDashboard],
    ["integrations", "Integrations", IconPlugConnected],
    ["plugins", "Studio tools", IconSparkles],
    ["security", "Security", IconShieldCheck],
    ["appearance", "Appearance", IconPalette],
    ["plan", "Plan & usage", IconRocket],
  ] as const;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-14">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-emerald-700/70 dark:text-emerald-300/65">
            WORKSPACE / PREFERENCES
          </p>
          <h1 className="font-mono text-4xl font-semibold tracking-[-0.08em] text-foreground sm:text-5xl">
            Control{" "}
            <span className="text-emerald-600 dark:text-emerald-300">
              room.
            </span>
          </h1>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            Tune your studio, connect the services that power it, and keep your
            publishing workflow in sync.
          </p>
        </div>
        <Card
          className={`flex shrink-0 flex-row items-center gap-3 rounded-xl px-3 py-2.5 `}
        >
          <span className="grid size-9 place-items-center rounded-lg bg-violet-500 text-xs font-bold text-white shadow-sm shadow-violet-500/30">
            ZC
          </span>
          <span className="min-w-0">
            <strong className="block text-xs font-medium">
              Zerocraft Studio
            </strong>
            <small className="block text-[11px] text-muted-foreground">
              Administrator workspace
            </small>
          </span>
          <IconChevronRight size={15} className="text-muted-foreground" />
        </Card>
      </header>

      <Card
        className={`flex flex-col justify-between gap-4 rounded-xl p-4 sm:flex-row sm:items-center `}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg border border-violet-400/25 bg-violet-500/10 text-violet-500">
            <IconActivity size={18} />
          </span>
          <span>
            <strong className="block text-sm font-medium">
              All systems operational
            </strong>
            <small className="block text-xs text-muted-foreground">
              Last workspace check completed just now.
            </small>
          </span>
        </div>
        <Badge
          variant="outline"
          className="w-fit gap-1.5 border-emerald-400/30 font-mono text-[10px] tracking-[0.12em] text-emerald-700 dark:text-emerald-300"
        >
          <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,.7)]" />{" "}
          LIVE / 99.99%
        </Badge>
      </Card>

      <div className="grid items-start gap-8 lg:grid-cols-[164px_minmax(0,1fr)]">
        <nav
          aria-label="Settings sections"
          className="sticky top-5 flex gap-1 overflow-x-auto pb-2 lg:top-6 lg:grid lg:gap-1 lg:overflow-visible lg:pb-0"
        >
          <p className="hidden px-2 pb-2 font-mono text-[9px] font-semibold tracking-[0.16em] text-muted-foreground lg:block">
            CONTROL ROOM
          </p>
          {sections.map(([id, label, Icon], index) => (
            <a
              key={id}
              href={`#${id}`}
              className={`flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-2.5 text-xs transition-colors hover:bg-muted/70 hover:text-foreground ${index === 0 ? "bg-muted/70 text-foreground" : "text-muted-foreground"}`}
            >
              <Icon size={14} />
              {label}
            </a>
          ))}
          <div className="mt-3 hidden items-center gap-2 border-t border-border/60 px-2 pt-3 font-mono text-[9px] tracking-[0.12em] text-emerald-700/70 dark:text-emerald-300/70 lg:flex">
            <span className="size-1.5 rounded-full bg-emerald-400" /> CRT /
            ONLINE
          </div>
        </nav>

        <div className="min-w-0 space-y-8">
          <section id="general" className="scroll-mt-6">
            <SectionHeader
              eyebrow="01 / WORKSPACE"
              title="General"
              description="The essentials behind your studio and published site."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className={`flex flex-row items-center gap-3 p-3.5 `}>
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-500 text-sm font-bold text-white">
                  Z
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-medium">
                    Zerocraft Studio
                  </strong>
                  <small className="block truncate text-xs text-muted-foreground">
                    studio.zerocraft · Production workspace
                  </small>
                </span>
                <StatusBadge>Ready</StatusBadge>
              </Card>
              <Card className={`flex flex-row items-center gap-3 p-3.5 `}>
                <IconWorld
                  size={18}
                  className="shrink-0 text-muted-foreground"
                />
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm font-medium">
                    Public site
                  </strong>
                  <small className="block truncate text-xs text-muted-foreground">
                    zerocraft.studio · Updated 2m ago
                  </small>
                </span>
                <Button
                  render={<Link href="/" />}
                  nativeButton={false}
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Open public site"
                >
                  <IconExternalLink />
                </Button>
              </Card>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5`}
              >
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <IconDatabase size={14} />
                  Database
                </span>
                <StatusBadge>Connected</StatusBadge>
              </div>
              <div
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5`}
              >
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <IconCloud size={14} />
                  Asset storage
                </span>
                <StatusBadge>Healthy</StatusBadge>
              </div>
              <div
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5`}
              >
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <IconCode size={14} />
                  API gateway
                </span>
                <StatusBadge>Healthy</StatusBadge>
              </div>
              <div
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5`}
              >
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <IconBolt size={14} />
                  Deployments
                </span>
                <StatusBadge>Ready</StatusBadge>
              </div>
            </div>
          </section>

          <section id="integrations" className="scroll-mt-6">
            <SectionHeader
              eyebrow="02 / CONNECTIONS"
              title="Integrations"
              description="Services connected to your publishing pipeline."
            />
            <Card className={`divide-y divide-border/60 overflow-hidden `}>
              <IntegrationRow
                icon={<IconDatabase size={18} />}
                title="Supabase"
                status="Connected"
                detail="Auth, database, realtime notices, and storage."
                meta="zerocraft-prod / primary"
                action={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Open Supabase integration"
                  >
                    <IconArrowUpRight />
                  </Button>
                }
              />
              <IntegrationRow
                icon={<IconBell size={18} />}
                title="Notification relay"
                status="Ready"
                detail="Keep your team informed about content and deployments."
                meta="In-app notifications enabled"
                action={
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                }
              />
              <IntegrationRow
                icon={<IconKey size={18} />}
                title="Webhooks"
                status="Optional"
                missing
                detail="Send publishing events to external tools and workflows."
                meta="No endpoints configured"
                action={
                  <Button variant="outline" size="sm">
                    Add endpoint
                  </Button>
                }
              />
            </Card>
          </section>

          <section id="plugins" className="scroll-mt-6">
            <SectionHeader
              eyebrow="03 / STUDIO TOOLS"
              title="Make the studio yours"
              description="Optional tools that make daily publishing faster without changing your workflow."
            />
            <div className="grid gap-3 md:grid-cols-3">
              <ToolCard
                icon={<IconBrain size={17} />}
                tone="violet"
                title="AI copilot"
                description="Draft metadata, summaries, and content suggestions in context."
                action={
                  <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
                }
                label={aiEnabled ? "Enabled" : "Disabled"}
              />
              <ToolCard
                icon={<IconBolt size={17} />}
                tone="lime"
                title="Smart automations"
                description="Prepare repeatable publishing actions for your team."
                action={
                  <Switch
                    checked={automationsEnabled}
                    onCheckedChange={setAutomationsEnabled}
                  />
                }
                label={automationsEnabled ? "Enabled" : "Disabled"}
              />
              <ToolCard
                icon={<IconBrush size={17} />}
                tone="blue"
                title="Writing workspace"
                description="Keep drafts focused with a clean, distraction-free editor."
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between"
                  >
                    Open workspace <IconArrowUpRight />
                  </Button>
                }
              />
            </div>
          </section>

          <section id="security" className="scroll-mt-6">
            <SectionHeader
              eyebrow="04 / ACCESS"
              title="Security & access"
              description="Control account protection and the people who can operate this workspace."
              action={<StatusBadge>Protected</StatusBadge>}
            />
            <div className="grid gap-2">
              <SettingRow
                icon={<IconLock size={17} />}
                title="Re-authentication"
                description="Ask for a fresh sign-in before sensitive changes."
                action={
                  <Switch
                    checked={reAuthEnabled}
                    onCheckedChange={setReAuthEnabled}
                  />
                }
              />
              <SettingRow
                icon={<IconUsers size={17} />}
                title="Team access"
                description="Review roles, invitations, and active collaborators."
                action={
                  <Button
                    render={<Link href="/studio/settings/staff" />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                  >
                    Manage <IconArrowUpRight />
                  </Button>
                }
              />
              <SettingRow
                icon={<IconShieldCheck size={17} />}
                title="Active sessions"
                description="One trusted browser session is currently active."
                action={
                  <Button variant="outline" size="sm">
                    Review
                  </Button>
                }
              />
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <IconCheck
                size={14}
                className="mt-0.5 shrink-0 text-emerald-500"
              />
              Your studio uses protected routes and server-side session checks
              for every workspace action.
            </p>
          </section>

          <section id="appearance" className="scroll-mt-6">
            <SectionHeader
              eyebrow="05 / INTERFACE"
              title="Appearance"
              description="A quiet interface keeps controls, content, and data easy to scan."
            />
            <Card className={`p-4 `}>
              <CardHeader className="p-0">
                <CardTitle className="flex items-center gap-3 text-sm">
                  <span className="grid size-8 place-items-center rounded-lg border border-border/70 bg-muted/40">
                    <IconPalette size={15} />
                  </span>
                  Color mode
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-3">
                <AppearanceSettings />
              </CardContent>
            </Card>
            <div
              className={`mt-3 flex items-center justify-between gap-4 rounded-xl border p-3.5`}
            >
              <span className="inline-flex items-center gap-2 text-sm">
                <IconSparkles size={15} className="text-muted-foreground" />
                Reduce interface motion
              </span>
              <Switch
                checked={reducedMotion}
                onCheckedChange={setReducedMotion}
              />
            </div>
          </section>

          <section id="plan" className="scroll-mt-6">
            <SectionHeader
              eyebrow="06 / PLAN"
              title="Plan & usage"
              description="A quick view of the resources available to your workspace."
            />
            <Card className={`p-4 `}>
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-emerald-400/25 bg-emerald-400/10 font-mono text-lg text-emerald-600 dark:text-emerald-300">
                  ∞
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm font-medium">
                    Studio plan
                  </strong>
                  <small className="block text-xs leading-5 text-muted-foreground">
                    Unlimited collaborators · priority support · advanced
                    publishing
                  </small>
                </span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] tracking-[0.12em]"
                >
                  ACTIVE
                </Badge>
              </div>
              <Separator className="my-4" />
              <div className="space-y-3">
                <UsageRow
                  icon={<IconActivity size={14} />}
                  label="Monthly publishing"
                  value="24 / unlimited"
                />
                <UsageRow
                  icon={<IconUsers size={14} />}
                  label="Team seats"
                  value="3 active members"
                />
                <UsageRow
                  icon={<IconCloud size={14} />}
                  label="Asset storage"
                  value="12.4 GB used"
                />
              </div>
            </Card>
          </section>

          <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-4 font-mono text-[10px] tracking-[0.1em] text-muted-foreground">
            <span>ZERØCRAFT CONTROL ROOM · v1.0</span>
            <Link
              className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
              href="/studio"
            >
              Back to studio <IconArrowUpRight size={12} />
            </Link>
            <Link
              className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
              href="/studio/settings/staff"
            >
              Manage staff <IconArrowUpRight size={12} />
            </Link>
          </footer>
        </div>
      </div>
    </main>
  );
}

function IntegrationRow({
  icon,
  title,
  status,
  missing,
  detail,
  meta,
  action,
}: {
  icon: ReactNode;
  title: string;
  status: string;
  missing?: boolean;
  detail: string;
  meta: string;
  action: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-3.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border/70 bg-muted/40 text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium">{title}</h3>
          <StatusBadge missing={missing}>{status}</StatusBadge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        <small className="mt-1 block font-mono text-[10px] text-muted-foreground/80">
          {meta}
        </small>
      </div>
      {action}
    </div>
  );
}

function ToolCard({
  icon,
  tone,
  title,
  description,
  action,
  label,
}: {
  icon: ReactNode;
  tone: "violet" | "lime" | "blue";
  title: string;
  description: string;
  action: ReactNode;
  label?: string;
}) {
  const tones = {
    violet: "border-violet-400/25 bg-violet-500/10 text-violet-500",
    lime: "border-lime-400/25 bg-lime-500/10 text-lime-600 dark:text-lime-300",
    blue: "border-sky-400/25 bg-sky-500/10 text-sky-500",
  };
  return (
    <Card className={`flex min-h-40 flex-col gap-4 p-4 `}>
      <span
        className={`grid size-8 place-items-center rounded-lg border ${tones[tone]}`}
      >
        {icon}
      </span>
      <div className="flex-1">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        {label && (
          <span className="inline-flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            {label}
          </span>
        )}
        {action}
      </div>
    </Card>
  );
}

function UsageRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-mono text-[10px] text-muted-foreground">
        {value}
      </span>
    </div>
  );
}
