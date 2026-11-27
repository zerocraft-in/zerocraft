"use client";

/* eslint-disable react-hooks/set-state-in-effect -- state here reacts to server action results */
import * as React from "react";

import { useToast } from "@/components/ui/toast";
import { resendVerification, type AuthActionState } from "@/lib/auth/actions";

const COOLDOWN = 30;

export function ResendForm({
  email,
  next,
  initialSent,
}: {
  readonly email: string;
  readonly next: string;
  readonly initialSent: boolean;
}) {
  const { toast } = useToast();
  const [state, action, pending] = React.useActionState<AuthActionState, FormData>(resendVerification, null);
  const [seconds, setSeconds] = React.useState(initialSent ? COOLDOWN : 0);

  React.useEffect(() => {
    if (seconds <= 0) return;
    const t = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [seconds]);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      setSeconds(COOLDOWN);
      toast({ variant: "success", title: "New link sent", description: email });
    } else if (state.error) {
      const limited = state.errorCode === "rate_limited";
      if (limited && state.retryAfterSeconds) setSeconds(state.retryAfterSeconds);
      toast({ variant: limited ? "warning" : "danger", title: state.error });
    }
  }, [state, toast, email]);

  return (
    <form action={action}>
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />
      <button type="submit" className="zc-pill-btn" disabled={pending || seconds > 0}>
        {pending ? "Sending…" : seconds > 0 ? `Resend link in ${seconds}s` : "Resend link"}
      </button>
    </form>
  );
}