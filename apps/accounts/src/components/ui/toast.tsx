"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

import { ease } from "@/lib/motion";

type Variant = "success" | "danger" | "warning" | "info";
type ToastInput = {
  title: string;
  description?: string;
  variant?: Variant;
  /** ms. Defaults: 4000, errors 6000. Use 0 to keep until dismissed. */
  duration?: number;
};
type ToastItem = ToastInput & { id: number; variant: Variant };

const MAX_VISIBLE = 3;
const icons = {
  success: CheckCircle2,
  danger: XCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

const ToastContext = React.createContext<{ toast: (t: ToastInput) => void } | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

function ToastView({ item, onClose }: { item: ToastItem; onClose: (id: number) => void }) {
  const reduce = useReducedMotion();
  const [paused, setPaused] = React.useState(false);
  const Icon = icons[item.variant];
  const duration = item.duration ?? (item.variant === "danger" ? 6000 : 4000);

  React.useEffect(() => {
    if (!duration || paused) return;
    const t = window.setTimeout(() => onClose(item.id), duration);
    return () => window.clearTimeout(t);
  }, [duration, paused, item.id, onClose]);

  return (
    <motion.div
      layout={!reduce}
      role={item.variant === "danger" || item.variant === "warning" ? "alert" : "status"}
      className={`zc-toast zc-toast--${item.variant}`}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon className="zc-toast-icon" size={16} aria-hidden="true" />
      <div className="zc-toast-body">
        <p className="zc-toast-title">{item.title}</p>
        {item.description ? <p className="zc-toast-desc">{item.description}</p> : null}
      </div>
      <button type="button" className="zc-toast-close" aria-label="Dismiss notification" onClick={() => onClose(item.id)}>
        <X size={14} aria-hidden="true" />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const idRef = React.useRef(0);

  const close = React.useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const toast = React.useCallback((t: ToastInput) => {
    const id = ++idRef.current;
    setItems((l) => [...l, { ...t, id, variant: t.variant ?? "info" }].slice(-MAX_VISIBLE));
  }, []);
  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="zc-toaster">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <ToastView key={item.id} item={item} onClose={close} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
