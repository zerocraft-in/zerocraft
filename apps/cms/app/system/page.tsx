import Link from "next/link";
import {
  IconActivity,
  IconFileText,
  IconHeartbeat,
  IconMail,
  IconShieldCheck,
} from "@tabler/icons-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ADMIN_ROUTES } from "@/lib/admin-routes";

const systemTools = [
  {
    label: "Audit log",
    description: "Review workspace activity and security events.",
    href: ADMIN_ROUTES.system.auditLogs,
    icon: IconShieldCheck,
  },
  {
    label: "Email delivery",
    description: "Monitor delivery status, retries, and failures.",
    href: ADMIN_ROUTES.system.emailEvents,
    icon: IconMail,
  },
  {
    label: "Automation health",
    description: "Check scheduled jobs and recent sync results.",
    href: ADMIN_ROUTES.system.automations,
    icon: IconActivity,
  },
  {
    label: "Notification history",
    description: "View and filter staff notifications.",
    href: ADMIN_ROUTES.system.notifications,
    icon: IconMail,
  },
  {
    label: "Weekly reports",
    description: "Manage reliability reports and delivery history.",
    href: ADMIN_ROUTES.system.notificationReports,
    icon: IconFileText,
  },
  {
    label: "System health",
    description: "Run diagnostics across database, storage, email, and cron.",
    href: ADMIN_ROUTES.system.systemHealth,
    icon: IconHeartbeat,
  },
] as const;

export default function SystemPage() {
  return (
    <main className="mx-auto w-full max-w-[1180px] pb-14">
      <header className="border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          System
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">System</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Keep your workspace operations, notifications, and infrastructure
          healthy.
        </p>
      </header>

      <nav
        aria-label="System sections"
        className="mt-5 flex flex-wrap gap-1 rounded-xl border border-border bg-muted/30 p-1"
      >
        {systemTools.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            {label}
          </Link>
        ))}
      </nav>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {systemTools.map(({ label, description, href, icon: Icon }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full border-border shadow-none transition-colors group-hover:border-foreground/25 group-hover:bg-muted/20">
              <CardHeader className="pb-3">
                <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-4" stroke={1.8} />
                </span>
                <CardTitle className="pt-1 text-sm">{label}</CardTitle>
                <CardDescription className="leading-5">
                  {description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                Open {label} →
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </main>
  );
}
