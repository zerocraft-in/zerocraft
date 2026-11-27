"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@zerocraft/ui/button";

export type DirtyBarProps = {
  dirty: boolean;
  saving?: boolean;
  label?: string;
  onDiscard: () => void;
  onSave: () => void;
};

export function DirtyBar({
  dirty,
  saving = false,
  label = "Unsaved changes",
  onDiscard,
  onSave,
}: DirtyBarProps) {
  const [shake, setShake] = React.useState(false);
  const guardActive = React.useRef(false);

  React.useEffect(() => {
    if (!dirty) {
      // The owner decides where to go after discard/save. Do not call
      // history.back() here; that races with router navigation and can return
      // the user to the dirty form after it has already been reset.
      guardActive.current = false;
      return;
    }

    window.history.pushState({ dirtyGuard: true }, "", window.location.href);
    guardActive.current = true;

    const handlePopState = () => {
      setShake(true);
      window.setTimeout(() => setShake(false), 460);
      window.history.pushState({ dirtyGuard: true }, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [dirty]);

  return (
    <div className="pointer-events-none sticky top-0 z-[1000] flex h-0 w-full justify-center px-4">
      {dirty && (
        <motion.div
          role="status"
          aria-live="polite"
          animate={shake ? { x: [0, -7, 7, -5, 5, 0] } : { x: 0 }}
          transition={{ duration: 0.42, ease: "easeInOut" }}
          className="pointer-events-auto relative top-1 flex h-10 w-full max-w-[280px] items-center justify-between rounded-full bg-foreground px-1 shadow-lg"
        >
          <span className="px-2 text-[13px] text-primary-foreground">{label}</span>
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              size="sm"
              onClick={onDiscard}
              disabled={saving}
              className="h-8 rounded-xl bg-muted-foreground/50 px-3 text-primary-foreground hover:bg-muted-foreground/60"
            >
              Discard
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onSave}
              disabled={saving}
              className="h-8 rounded-xl px-3"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
