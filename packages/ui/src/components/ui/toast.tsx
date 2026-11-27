"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CircleAlert,
  CircleHelp,
  LoaderCircle,
  TriangleAlert,
  X,
} from "lucide-react";

export type ToastType = "success" | "error" | "loading" | "info" | "warning";

export type ToastOptions = {
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number | null;
};

export type ToastItem = ToastOptions & {
  id: string;
  type: ToastType;
};

type ToastListener = () => void;

const listeners = new Set<ToastListener>();
let toastItems: ToastItem[] = [];
let nextToastId = 0;

const EMPTY_TOASTS: ToastItem[] = [];
const MAX_TOASTS = 3;

const timers = new Map<string, ReturnType<typeof setTimeout>>();

function emit() {
  listeners.forEach((listener) => listener());
}

function removeToast(id: string) {
  const timer = timers.get(id);

  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }

  const nextItems = toastItems.filter((item) => item.id !== id);

  if (nextItems.length === toastItems.length) return;

  toastItems = nextItems;
  emit();
}

function addToast(options: ToastOptions) {
  const id = `toast-${++nextToastId}`;

  const item: ToastItem = {
    ...options,
    id,
    type: options.type ?? "info",
  };

  toastItems = [...toastItems, item];

  while (toastItems.length > MAX_TOASTS) {
    const removed = toastItems.shift();

    if (removed) {
      const timer = timers.get(removed.id);

      if (timer) clearTimeout(timer);

      timers.delete(removed.id);
    }
  }

  emit();

  const duration =
    options.duration ??
    (item.type === "loading" ? null : item.type === "error" ? 5000 : 3500);

  if (duration !== null && duration > 0) {
    const timer = setTimeout(() => {
      removeToast(id);
    }, duration);

    timers.set(id, timer);
  }

  return id;
}

export const toast = {
  add: addToast,

  remove: removeToast,

  dismiss: removeToast,

  clear: () => {
    timers.forEach(clearTimeout);
    timers.clear();
    toastItems = [];
    emit();
  },

  success: (title: string, options?: Omit<ToastOptions, "title" | "type">) =>
    addToast({ ...options, title, type: "success" }),

  error: (title: string, options?: Omit<ToastOptions, "title" | "type">) =>
    addToast({ ...options, title, type: "error" }),

  info: (title: string, options?: Omit<ToastOptions, "title" | "type">) =>
    addToast({ ...options, title, type: "info" }),

  warning: (title: string, options?: Omit<ToastOptions, "title" | "type">) =>
    addToast({ ...options, title, type: "warning" }),

  loading: (title: string, options?: Omit<ToastOptions, "title" | "type">) =>
    addToast({ ...options, title, type: "loading", duration: null }),
};

function subscribe(listener: ToastListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return toastItems;
}

function getServerSnapshot() {
  return EMPTY_TOASTS;
}

function ToastIcon({ type }: { type: ToastType }) {
  const common = "size-[17px]";

  const icons = {
    success: <Check className={`${common} text-[#39d353]`} strokeWidth={2.8} />,
    error: <CircleAlert className={`${common} text-[#ff6b68]`} />,
    loading: <LoaderCircle className={`${common} animate-spin text-white`} />,
    info: <CircleHelp className={`${common} text-[#72b7ff]`} />,
    warning: <TriangleAlert className={`${common} text-[#f5b83d]`} />,
  };

  return (
    <span className="flex size-5 shrink-0 items-center justify-center">
      {icons[type]}
    </span>
  );
}

function ToastCard({ item }: { item: ToastItem }) {
  return (
    <motion.div
      layout
      initial={{
        opacity: 0,
        y: -14,
        scale: 0.96,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      exit={{
        opacity: 0,
        y: -8,
        scale: 0.94,
      }}
      transition={{
        type: "spring",
        stiffness: 420,
        damping: 32,
      }}
      role={item.type === "error" ? "alert" : "status"}
      aria-live={item.type === "error" ? "assertive" : "polite"}
      className="
        group relative pointer-events-auto flex w-fit
        min-h-8 max-w-[calc(100vw-32px)] items-center
        gap-2.5 rounded-full border border-white/10
        bg-[#1f1f1f] px-4 py-2 text-white
        shadow-[0_8px_30px_rgba(0,0,0,0.28)]
        backdrop-blur-xl
      "
    >
      {/* Close button */}
      <button
        type="button"
        onClick={() => removeToast(item.id)}
        aria-label="Dismiss notification"
        className="
          absolute -left-2 -top-2 z-20
          flex size-[20px] items-center justify-center
          rounded-full border border-white/10
          bg-[#292929] text-white/70 shadow-lg

          opacity-0 scale-75 pointer-events-none
          transition-all duration-200 ease-out

          group-hover:opacity-100
          group-hover:scale-100
          group-hover:pointer-events-auto

          focus-visible:opacity-100
          focus-visible:scale-100
          focus-visible:pointer-events-auto
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-white/70

          [@media(hover:none)]:opacity-100
          [@media(hover:none)]:scale-100
          [@media(hover:none)]:pointer-events-auto
        "
      >
        <X className="size-3" strokeWidth={2.5} />
      </button>

      <ToastIcon type={item.type} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium leading-5">
          {item.title}
        </p>

        {item.description && (
          <p className="truncate text-xs text-white/60">{item.description}</p>
        )}
      </div>
    </motion.div>
  );
}

export function Toaster() {
  const items = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return (
    <div
      id="zerocraft-toaster"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center px-4 pt-[max(12px,env(safe-area-inset-top))]"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-2">
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item) => (
            <ToastCard key={item.id} item={item} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
