import { Spinner } from "@zerocraft/ui/components/spinner";
import { cn } from "@zerocraft/ui/cn";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function StudioLoading({
  label = "Loading Studio…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "flex items-center justify-center gap-2 text-sm text-muted-foreground",
        className,
      )}
    >
      <Spinner className="size-4 shrink-0 text-primary" />
      <span>{label}</span>
    </div>
  );
}

export function StudioLoadTransition({
  loading,
  label,
  loadingClassName,
  children,
}: {
  loading: boolean;
  label?: string;
  loadingClassName?: string;
  children: ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const duration = reducedMotion ? 0 : 0.2;

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration, ease: "easeOut" }}
        >
          <StudioLoading label={label} className={loadingClassName} />
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
