"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { Separator } from "@zerocraft/ui/separator";

type TabKey = "roles" | "security";

const TABS: TabKey[] = ["roles", "security"];

export default function OrganizationAccountPage() {
  const pathname = usePathname();
  const activeTab = pathname.endsWith("/security")
    ? "security"
    : "roles";

  return (
    <div className="mx-auto flex max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="min-w-0 flex items-center gap-2">
          <div
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand text-[13px] font-bold text-brand-fg"
          >
            M
          </div>
          <div className="min-w-0 leading-tight">
            <h2 className="text-sm font-semibold tracking-[-0.02em] text-body">
              Organization Account
            </h2>
            <p className="hidden text-2xs text-meta sm:block">
              Manage access, roles, and security for your organization.
            </p>
          </div>
        </div>
      </div>

      <Separator className="mt-4 mb-8" />

      <div className="flex gap-1 mb-8">
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <Link
              key={tab}
              href={`/settings/organization-account/${tab}`}
              className={cn(
                  "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent border-transparent text-sidebar-accent-foreground"
                    : "border-input text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
            >
              <span className="text-[1px]">●</span>
              {tab === "roles" ? "Roles" : "Security"}
            </Link>
          );
        })}
      </div>

      {activeTab === "roles" && (
        <div className="flex flex-col gap-4">
          <Link
            href="/settings/organization-account/roles"
            className="group flex items-center gap-3 rounded-lg border border-input px-4 py-3 text-left hover:bg-accent transition-colors"
          >
            <span className="flex shrink-0 items-center justify-center size-5 rounded-full bg-muted text-sm font-medium text-muted-foreground">
              R
            </span>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-semibold">
                Role &amp; Permissions
              </span>
              <span className="text-xs text-muted-foreground">
                Assign roles and permissions to organization members
              </span>
            </div>
          </Link>
        </div>
      )}

      {activeTab === "security" && (
        <div className="flex flex-col gap-4">
          <Link
            href="/settings/organization-account/security"
            className="group flex items-center gap-3 rounded-lg border border-input px-4 py-3 text-left hover:bg-accent transition-colors"
          >
            <span className="flex shrink-0 items-center justify-center size-5 rounded-full bg-muted text-sm font-medium text-muted-foreground">
              S
            </span>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-semibold">
                Security
              </span>
              <span className="text-xs text-muted-foreground">
                Manage secure sign-in and access controls
              </span>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
