"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "@zerocraft/ui/toast";

import {
  archiveLocation,
  assignUserToLocation,
  unassignUserFromLocation,
} from "./actions";
import LocationForm from "./location-form";
import { Button } from "@zerocraft/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@zerocraft/ui/card";
import { Badge } from "@zerocraft/ui/badge";
import { Separator } from "@zerocraft/ui/separator";

type LocationRow = {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  address: Record<string, unknown> | null;
  contact_phone: string | null;
  contact_email: string | null;
  status: string;
  created_at: string;
  location_user_assignments: Array<{ user_id: string }>;
};

type MemberRow = {
  user_id: string;
  full_name: string | null;
};

type UserLocationRow = {
  user_id: string;
  location_id: string;
};

interface LocationsManagerProps {
  locations: LocationRow[];
  members: MemberRow[];
  userLocations: UserLocationRow[];
  canManage: boolean;
  errorMessage: string | null;
}

export default function LocationsManager({
  locations,
  members,
  userLocations,
  canManage,
  errorMessage,
}: LocationsManagerProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [editingLocation, setEditingLocation] = React.useState<LocationRow | null>(
    null,
  );
  const [managingUsersFor, setManagingUsersFor] = React.useState<string | null>(
    null,
  );
  const [isArchiving, setIsArchiving] = React.useState<string | null>(null);
  const [isAssigning, setIsAssigning] = React.useState<string | null>(null);

  // Build assignment map from userLocations
  const locationAssignments = new Map<string, string[]>();
  for (const ul of userLocations) {
    const ids = locationAssignments.get(ul.location_id) ?? [];
    ids.push(ul.user_id);
    locationAssignments.set(ul.location_id, ids);
  }

  // Build member map
  const memberById = new Map<string, MemberRow>();
  for (const member of members) {
    memberById.set(member.user_id, member);
  }

  // Filter locations
  const filteredLocations = locations.filter((row) => {
    const matchesSearch =
      row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || row.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const router = useRouter();

  const handleArchive = async (locationId: string) => {
    setIsArchiving(locationId);
    try {
      const result = await archiveLocation({ id: locationId });
      if (result.ok) {
        toast.add({ title: "Location archived.", type: "success" });
        await router.refresh();
      } else {
        toast.add({ title: result.error, type: "error" });
      }
    } finally {
      setIsArchiving(null);
    }
  };

  const handleAssign = async (
    locationId: string,
    userId: string,
  ) => {
    setIsAssigning(userId);
    try {
      const result = await assignUserToLocation({
        user_id: userId,
        location_id: locationId,
      });
      if (result.ok) {
        toast.add({ title: "User assigned to location.", type: "success" });
        await router.refresh();
      } else {
        toast.add({ title: result.error, type: "error" });
      }
    } finally {
      setIsAssigning(null);
    }
  };

  const handleUnassign = async (
    locationId: string,
    userId: string,
  ) => {
    setIsAssigning(userId);
    try {
      const result = await unassignUserFromLocation({
        user_id: userId,
        location_id: locationId,
      });
      if (result.ok) {
        toast.add({ title: "User unassigned from location.", type: "success" });
        await router.refresh();
      } else {
        toast.add({ title: result.error, type: "error" });
      }
    } finally {
      setIsAssigning(null);
    }
  };

  const assignedUserIdsFor = (locationId: string): string[] => {
    return locationAssignments.get(locationId) ?? [];
  };

  const getAssignedUserNames = (locationId: string): string[] => {
    return assignedUserIdsFor(locationId)
      .map((uid) => memberById.get(uid)?.full_name ?? "Unknown user")
      .filter((name): name is string => name !== null);
  };

  const contactParts = (row: LocationRow): string[] =>
    [row.contact_phone, row.contact_email].filter(
      (value): value is string => value !== null && value !== undefined,
    );

  const addressText = (row: LocationRow): string => {
    const addr = row.address;
    if (addr === null || addr === undefined) return "";
    if (typeof addr === "string") return addr;
    if (typeof addr === "object" && "raw" in addr) {
      return String((addr as { raw?: unknown }).raw ?? "");
    }
    return "";
  };

  if (errorMessage) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-10">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-body">{errorMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              Locations
            </h2>
            <p className="hidden text-2xs text-meta sm:block">
              Manage store and branch locations
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => setShowCreateForm(true)}
            >
              Create Location
            </Button>
          </div>
        )}
      </div>

      <Separator className="mt-4 mb-8" />

      {canManage && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="flex-none sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | "active" | "inactive")
              }
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="all">All Locations</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-left pb-3">Name</th>
                  <th className="text-left pb-3">Code</th>
                  <th className="text-left pb-3">Address</th>
                  <th className="text-left pb-3">Contact</th>
                  <th className="text-left pb-3">Status</th>
                  <th className="text-left pb-3">Assigned Users</th>
                  <th className="text-left pb-3">Created</th>
                  {canManage && (
                    <th className="text-right pb-3">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredLocations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canManage ? 8 : 7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No locations found.
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setShowCreateForm(true)}
                          className="ml-2 text-xs text-brand-text underline underline-offset-4 hover:underline"
                        >
                          Create Location
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredLocations.map((row) => {
                    const assignedUserNames = getAssignedUserNames(row.id);
                    const contacts = contactParts(row);
                    return (
                      <tr key={row.id} className="border-b">
                        <td className="py-3 text-body font-medium">
                          {row.name}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {row.code}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {addressText(row) || "—"}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {contacts.join(" · ") || "—"}
                        </td>
                        <td className="py-3">
                          <Badge
                            variant={
                              row.status === "active"
                                ? "success"
                                : "default"
                            }
                          >
                            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {assignedUserNames.length > 0
                            ? assignedUserNames.join(", ")
                            : "—"}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {new Date(row.created_at).toLocaleDateString()}
                        </td>
                        {canManage ? (
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingLocation(row)}
                                className="text-xs text-brand-text hover:underline"
                                disabled={editingLocation !== null}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Archive "${row.name}"? This will make the location inactive. Existing user assignments will be preserved.`,
                                    )
                                  ) {
                                    handleArchive(row.id);
                                  }
                                }}
                                className="text-xs text-destructive hover:underline"
                                disabled={isArchiving === row.id}
                              >
                                {isArchiving === row.id ? "Archiving..." : "Archive"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setManagingUsersFor(row.id)}
                                className="text-xs text-brand-text hover:underline"
                                disabled={managingUsersFor !== null}
                              >
                                Manage Users
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showCreateForm && canManage && (
        <LocationForm
          mode="create"
          onSuccess={() => {
            setShowCreateForm(false);
            toast.add({ title: "Location created successfully.", type: "success" });
            void router.refresh();
          }}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {editingLocation && canManage && (
        <LocationForm
          mode="edit"
          location={{
            id: editingLocation.id,
            name: editingLocation.name,
            code: editingLocation.code,
            address: editingLocation.address,
            contact_phone: editingLocation.contact_phone,
            contact_email: editingLocation.contact_email,
          }}
          onSuccess={() => {
            setEditingLocation(null);
            toast.add({ title: "Location updated successfully.", type: "success" });
            void router.refresh();
          }}
          onClose={() => setEditingLocation(null)}
        />
      )}

      {managingUsersFor !== null && canManage && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Manage Users</CardTitle>
            <CardDescription>
              Assign active organization members to this location.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.map((member) => {
                const isAssigned = assignedUserIdsFor(managingUsersFor).includes(
                  member.user_id,
                );
                const location = locations.find((l) => l.id === managingUsersFor);
                const isLocationActive = location?.status === "active";

                return (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-3 rounded-lg border border-input bg-background"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-inset text-[10px] font-bold text-body">
                        {(member.full_name ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col leading-none">
                        <p className="text-sm font-medium">
                          {member.full_name || "Unknown user"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.user_id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAssigned ? (
                        <button
                          type="button"
                          onClick={() => handleUnassign(managingUsersFor, member.user_id)}
                          className="text-xs text-destructive hover:underline"
                          disabled={isAssigning === member.user_id}
                        >
                          {isAssigning === member.user_id ? "Removing..." : "Unassign"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAssign(managingUsersFor, member.user_id)}
                          className="text-xs text-brand-text hover:underline"
                          disabled={!isLocationActive || isAssigning === member.user_id}
                        >
                          {isAssigning === member.user_id ? "Assigning..." : "Assign"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setManagingUsersFor(null)}
            >
              Done
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
