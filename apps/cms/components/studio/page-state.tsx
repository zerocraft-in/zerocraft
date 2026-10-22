import type { ReactNode } from "react";

import { IconAlertCircle, IconInbox, IconLoader2 } from "@tabler/icons-react";
import { cn } from "cn";

type PageStateProps = {
  kind: "loading" | "empty" | "error";
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

const defaults = {
  loading: ["Loading", "Please wait while the workspace data is loaded."],
  empty: ["Nothing here yet", "Create your first record to get started."],
  error: ["Something went wrong", "Try again or contact support if the issue continues."],
} as const;

export function PageState({
  kind,
  title,
  description,
  action,
  className,
}: PageStateProps) {
  const [defaultTitle, defaultDescription] = defaults[kind];
  const Icon = kind === "loading" ? IconLoader2 : kind === "empty" ? IconInbox : IconAlertCircle;

  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cn("grid min-h-56 place-items-center rounded-xl border border-dashed border-border px-6 py-10 text-center", className)}
    >
      <div className="max-w-sm">
        <span className={cn("mx-auto grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground", kind === "error" && "bg-destructive/10 text-destructive")}>
          <Icon className={cn("size-5", kind === "loading" && "animate-spin")} />
        </span>
        <p className="mt-3 text-sm font-medium">{title || defaultTitle}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description || defaultDescription}</p>
        {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}
