"use client";

import * as React from "react";

import { Button } from "@zerocraft/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@zerocraft/ui/card";
import { Badge } from "@zerocraft/ui/badge";
import { Separator } from "@zerocraft/ui/separator";
import { Search, Filter, ChevronUp } from "lucide-react";

export default function OrganizationAccountSecurityPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="min-w-0 flex items-center gap-2">
          <div
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand text-[13px] font-bold text-brand-fg"
          >
            S
          </div>
          <div className="min-w-0 leading-tight">
            <h2 className="text-sm font-semibold tracking-[-0.02em] text-body">
              Security
            </h2>
            <p className="hidden text-2xs text-meta sm:block">
              Manage secure sign-in and access controls for your organization.
            </p>
          </div>
        </div>
        <Button className="hidden sm:block">
          <Search className="mr-2 size-4" />
          View activity logs
        </Button>
      </div>

      <Separator className="mt-4 mb-8" />

      {/* Organization security */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle>Organization security</CardTitle>
            <CardDescription>
              Secure sign-in method is not required
            </CardDescription>
          </div>
          <Button size="sm">Change</Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-input bg-background p-4">
            <div className="flex items-start gap-3">
              <span className="flex shrink-0 mt-1">
                <ChevronUp className="size-4 text-muted-foreground" />
              </span>
              <div className="text-sm text-muted-foreground">
                Manage secure sign-in method requirements for each user from
                their user page. Users who are not required to use passkeys or
                two-step authentication could put your organization at risk.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User activity logs */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle>User activity logs</CardTitle>
            <CardDescription>
              Monitor and review user activities
            </CardDescription>
          </div>
          <Button size="sm">View</Button>
        </CardHeader>
        <CardContent />
      </Card>

      {/* Organization service accounts */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle>Organization service accounts</CardTitle>
            <CardDescription>
              Organization access for developer automations and agents
            </CardDescription>
          </div>
          <Button size="sm">Add service account</Button>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Search className="size-4 text-muted-foreground" />
              <Filter className="size-4 text-muted-foreground" />
              <ChevronUp className="size-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">
                Export
              </Button>
              <Button size="sm" variant="outline">
                Import
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-input bg-background p-6 text-center">
            <p className="text-sm font-medium">No service accounts</p>
            <p className="text-xs text-muted-foreground">
              Service accounts let automation act for this organization.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Partner API clients */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle>Partner API clients</CardTitle>
            <CardDescription>
              Manage apps and subscriptions, view financials, and more
            </CardDescription>
          </div>
          <Button size="sm">Add Partner API client</Button>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Search className="size-4 text-muted-foreground" />
              <Filter className="size-4 text-muted-foreground" />
              <ChevronUp className="size-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">
                Export
              </Button>
              <Button size="sm" variant="outline">
                Import
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-input bg-background p-6 text-center">
            <p className="text-sm font-medium">No Partner API clients</p>
            <p className="text-xs text-muted-foreground">
              Add a client to call the Partner API on behalf of this
              organization.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Store security */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Store security</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <div>
            <CardTitle className="text-sm font-semibold mb-2">
              Collaborators
            </CardTitle>
            <CardDescription>
              Give designers, developers, and marketers access to this store.
              Collaborators don&apos;t count toward your staff limit. Learn more
              about collaborators.
            </CardDescription>
            <div className="mt-4 rounded-lg border border-input bg-background p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex shrink-0 items-center gap-2 text-sm font-medium">
                    Devi Fashion Official
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    3392
                  </Badge>
                  <Button size="sm">Generate new code</Button>
                  <Button size="sm" variant="outline">
                    Delete
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Share this code to allow someone to send you a collaborator
                request for this store. You&apos;ll still need to review and approve
                this request from Users.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
