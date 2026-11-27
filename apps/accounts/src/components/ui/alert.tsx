import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

const icons = { success: CheckCircle2, danger: XCircle, warning: AlertTriangle, info: Info } as const;

/** Inline message. Use for things that belong to a form; use toasts for one-off feedback. */
export function Alert({
  variant = "info",
  children,
}: {
  readonly variant?: keyof typeof icons;
  readonly children: React.ReactNode;
}) {
  const Icon = icons[variant];
  return (
    <div className={`zc-alert zc-alert--${variant}`} role={variant === "danger" || variant === "warning" ? "alert" : "status"}>
      <Icon size={16} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
