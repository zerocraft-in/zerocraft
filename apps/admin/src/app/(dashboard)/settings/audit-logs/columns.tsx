import { createColumnHelper } from "@tanstack/react-table";

import { Badge } from "@zerocraft/ui/badge";

export type AuditLogRow = {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: unknown;
  created_at: string;
};

export type AuditLogDisplayRow = AuditLogRow & {
  actor_name: string;
  actor_initial: string;
};

export type AuditLogColumnCtx = {
  timeZone: string | undefined;
  actorNames: Map<string, string | null>;
};

const columnHelper = createColumnHelper<AuditLogDisplayRow>();

const ACTION_LABELS: Record<string, string> = {
  "organization.settings_changed": "Organization settings changed",
  "member.invited": "Member invited",
  "invitation.accepted": "Invitation accepted",
  "member.role_changed": "Member role changed",
  "category.created": "Category created",
  "category.updated": "Category updated",
  "category.archived": "Category archived",
  "category.status_changed": "Category status changed",
  "product.created": "Product created",
  "product.updated": "Product updated",
  "product.archived": "Product archived",
  "product.status_changed": "Product status changed",
  "variant.created": "Variant created",
  "variant.updated": "Variant updated",
  "variant.status_changed": "Variant status changed",
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function actionVariant(action: string): "default" | "success" | "outline" {
  switch (action) {
    case "member.invited":
    case "invitation.accepted":
    case "category.created":
    case "product.created":
    case "variant.created":
      return "success";
    case "category.archived":
    case "product.archived":
      return "outline";
    default:
      return "default";
  }
}

function renderMetadata(action: string, metadata: unknown): React.ReactNode {
  const m = metadata as Record<string, unknown> | null | undefined;
  if (!m || typeof m !== "object") {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (action === "organization.settings_changed") {
    const columns = m.changed_columns;
    if (Array.isArray(columns) && columns.length > 0) {
      return (
        <span className="text-xs text-body">
          {String(columns.join(", "))}
        </span>
      );
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (action === "member.invited") {
    const email = m.email;
    const role = m.role_key;
    if (typeof email === "string") {
      return (
        <span className="text-xs text-body">
          {email} as {String(role ?? "—")}
        </span>
      );
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (action === "invitation.accepted") {
    const email = m.email;
    if (typeof email === "string") {
      return <span className="text-xs text-body">{email}</span>;
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (action === "member.role_changed") {
    const oldRole = m.old_role_key;
    const newRole = m.new_role_key;
    if (typeof oldRole === "string" && typeof newRole === "string") {
      return (
        <span className="text-xs text-body">
          {oldRole} → {newRole}
        </span>
      );
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (action === "category.created") {
    const name = m.name;
    if (typeof name === "string") {
      return <span className="text-xs text-body">{name}</span>;
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (action === "category.updated") {
    const columns = m.changed_columns;
    if (Array.isArray(columns) && columns.length > 0) {
      return (
        <span className="text-xs text-body">
          {String(columns.join(", "))}
        </span>
      );
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (action === "category.archived") {
    const status = m.status;
    if (typeof status === "string") {
      return <span className="text-xs text-body">{status}</span>;
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (action === "category.status_changed") {
    const oldStatus = m.old_status;
    const newStatus = m.new_status;
    if (typeof oldStatus === "string" && typeof newStatus === "string") {
      return (
        <span className="text-xs text-body">
          {oldStatus} → {newStatus}
        </span>
      );
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (action === "product.created") {
    const name = m.name;
    const status = m.status;
    if (typeof name === "string") {
      return (
        <span className="text-xs text-body">
          {name}
          {typeof status === "string" ? ` (${status})` : ""}
        </span>
      );
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (action === "product.updated" || action === "variant.updated") {
    const columns = m.changed_columns;
    if (Array.isArray(columns) && columns.length > 0) {
      return (
        <span className="text-xs text-body">
          {String(columns.join(", "))}
        </span>
      );
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (action === "product.archived") {
    const status = m.status;
    if (typeof status === "string") {
      return <span className="text-xs text-body">{status}</span>;
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (action === "product.status_changed") {
    const oldStatus = m.old_status;
    const newStatus = m.new_status;
    if (typeof oldStatus === "string" && typeof newStatus === "string") {
      return (
        <span className="text-xs text-body">
          {oldStatus} → {newStatus}
        </span>
      );
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (action === "variant.created") {
    const sku = m.sku;
    if (typeof sku === "string") {
      return <span className="text-xs text-body">{sku}</span>;
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (action === "variant.status_changed") {
    const oldActive = m.old_is_active;
    const newActive = m.new_is_active;
    if (typeof oldActive === "boolean" && typeof newActive === "boolean") {
      const format = (value: boolean) => (value ? "active" : "inactive");
      return (
        <span className="text-xs text-body">
          {format(oldActive)} → {format(newActive)}
        </span>
      );
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return <span className="text-xs text-muted-foreground">—</span>;
}

function formatEventTime(
  createdAt: string,
  timeZone: string | undefined,
): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      ...(timeZone ? { timeZone } : {}),
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export function buildColumns(ctx: AuditLogColumnCtx) {
  const { timeZone, actorNames } = ctx;

  return [
    columnHelper.accessor("created_at", {
      header: "Time",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground whitespace-nowrap shrink-0">
          {formatEventTime(getValue(), timeZone)}
        </span>
      ),
      size: 140,
      minSize: 120,
      maxSize: 180,
    }),
    columnHelper.accessor("actor_user_id", {
      header: "Actor",
      cell: ({ row }) => {
        const actorName = !row.original.actor_user_id
          ? "System"
          : actorNames.get(row.original.actor_user_id) || "Unknown user";
        const actorInitial = (actorName.charAt(0) || "?").toUpperCase();

        return (
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-inset text-[10px] font-bold text-body">
              {actorInitial}
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <p className="text-sm font-semibold truncate">{actorName}</p>
            </div>
          </div>
        );
      },
      size: 150,
      minSize: 100,
      maxSize: 220,
    }),
    columnHelper.accessor("action", {
      header: "Action",
      cell: ({ getValue }) => (
        <Badge variant={actionVariant(getValue())} className="shrink-0">
          {actionLabel(getValue())}
        </Badge>
      ),
      size: 140,
      minSize: 100,
      maxSize: 200,
    }),
    columnHelper.accessor("entity_type", {
      header: "Entity",
      cell: ({ getValue }) => (
        <span className="min-w-0 block overflow-hidden overflow-ellipsis whitespace-nowrap text-muted-foreground shrink-0">
          {getValue()}
        </span>
      ),
      size: 100,
      minSize: 80,
      maxSize: 140,
    }),
    columnHelper.accessor("entity_id", {
      header: "Entity ID",
      cell: ({ row }) => {
        const entityId = row.original.entity_id;
        const truncated = entityId ? `${String(entityId).slice(0, 8)}…` : "—";
        return entityId ? (
          <span title={String(entityId)} className="text-muted-foreground shrink-0 whitespace-nowrap">
            {truncated}
          </span>
        ) : (
          <span className="text-muted-foreground shrink-0 whitespace-nowrap">{truncated}</span>
        );
      },
      size: 100,
      minSize: 80,
      maxSize: 140,
    }),
    columnHelper.accessor("action", {
      id: "details",
      header: "Details",
      cell: ({ row }) => (
        <span className="text-xs min-w-0 block overflow-hidden overflow-ellipsis whitespace-nowrap">
          {renderMetadata(row.original.action, row.original.metadata)}
        </span>
      ),
      size: 200,
      minSize: 150,
      maxSize: Number.MAX_SAFE_INTEGER,
    }),
  ];
}
