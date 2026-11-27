"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@zerocraft/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@zerocraft/ui/card";
import { Separator } from "@zerocraft/ui/separator";
import {
  Search,
  Plus,
} from "lucide-react";
import { Input } from "@zerocraft/ui/input";

type RoleRow = {
  id: string;
  name: string;
  category: string;
  users: number;
};

const ROLES: RoleRow[] = [
  { id: "1", name: "App developer", category: "Organization", users: 0 },
  { id: "2", name: "Associate", category: "Point of Sale", users: 0 },
  { id: "3", name: "Collaborator access", category: "Partner", users: 0 },
  { id: "4", name: "Limited permissions", category: "Point of Sale", users: 0 },
  { id: "5", name: "Organization administrator", category: "Organization", users: 0 },
  { id: "6", name: "Organization POS administrator", category: "Organization", users: 0 },
  { id: "7", name: "Organization user administrator", category: "Organization", users: 0 },
  { id: "8", name: "POS full permissions", category: "Point of Sale", users: 0 },
  { id: "9", name: "POS device setup", category: "Point of Sale", users: 0 },
  { id: "10", name: "POS user administrator", category: "Point of Sale", users: 0 },
  { id: "11", name: "Store administrator", category: "Store", users: 0 },
  { id: "12", name: "Store user", category: "Store", users: 0 },
  { id: "13", name: "Store user administrator", category: "Store", users: 0 },
];

export default function OrganizationAccountRolePage() {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredRoles = ROLES.filter((role) =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="min-w-0 flex items-center gap-2">
          <div
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand text-[13px] font-bold text-brand-fg"
          >
            R
          </div>
          <div className="min-w-0 leading-tight">
            <h2 className="text-sm font-semibold tracking-[-0.02em] text-body">
              Role &amp; Permissions
            </h2>
            <p className="hidden text-2xs text-meta sm:block">
              Assign roles and permissions to organization members.
            </p>
          </div>
        </div>
        <Link href="/settings/organization-account/role/new">
          <Button size="sm">
            <Plus className="size-4 mr-2" />
            Add role
          </Button>
        </Link>
      </div>

      <Separator className="mt-4 mb-8" />

      <div className="flex flex-col gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
          />
          <Input
            type="search"
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b">
                <th className="text-left pb-3">Name</th>
                <th className="text-left pb-3">Category</th>
                <th className="text-left pb-3">Users</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-muted-foreground">
                    No roles found.
                  </td>
                </tr>
              ) : (
                filteredRoles.map((role) => (
                  <tr key={role.id} className="border-b">
                    <td className="py-3 text-body font-medium">
                      {role.name}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {role.category}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {role.users}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
