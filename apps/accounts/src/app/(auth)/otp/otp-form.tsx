"use client";

/* eslint-disable react-hooks/set-state-in-effect -- state here reacts to server action results */
import * as React from "react";

import { useToast } from "@/components/ui/toast";
import { resendOtp, verifyEmailOtp, type AuthActionState } from "@/lib/auth/actions";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30; // seconds; a code was just sent when this page opens

/**
 * One real <input> drawn as six boxes.
 * Why: six separate inputs need manual focus juggling (that was the bug: focus never moved),
 * and break paste / SMS autofill. A single input gets typing, backspace, paste and
 * one-time-code autofill from the browser for free.
 */
export function OtpForm({ email, next }: { readonly email: string; readonly next: string }) {
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const lastSubmitted = React.useRef<string | null>(null);

  const [code, setCode] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [shake, setShake] = React.useState(false);
  const [seconds, setSeconds] = React.useState(RESEND_COOLDOWN);

  const [verifyState, verifyAction, verifying] = React.useActionState<AuthActionState, FormData>(verifyEmailOtp, null);
  const [resendState, resendAction, resending] = React.useActionState<AuthActionState, FormData>(resendOtp, null);

  const submit = React.useCallback(
    (value: string) => {
      const fd = new FormData();
      fd.set("email", email);
      fd.set("otp", value);
      fd.set("next", next);
      React.startTransition(() => {
        void verifyAction(fd);
      });
    },
    [email, next, verifyAction],
  );

  // Focus on mount.
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Resend countdown (a single timeout per tick, so no interval can leak or double up).
  React.useEffect(() => {
    if (seconds <= 0) return;
    const t = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [seconds]);

  // Auto-verify when the 6th digit is entered. The ref stops the same code being sent twice.
  React.useEffect(() => {
    if (code.length === OTP_LENGTH && !verifying && lastSubmitted.current !== code) {
      lastSubmitted.current = code;
      submit(code);
    }
  }, [code, verifying, submit]);

  // Wrong or rate-limited code: show the message, clear the boxes, refocus, shake once.
  React.useEffect(() => {
    if (!verifyState || verifyState.ok) return;
    const wait =
      verifyState.errorCode === "rate_limited" && verifyState.retryAfterSeconds
        ? ` Try again in ${verifyState.retryAfterSeconds} seconds.`
        : "";
    setError(`${verifyState.error ?? "That code didn't work."}${wait}`);
    setCode("");
    lastSubmitted.current = null;
    setShake(true);
    inputRef.current?.focus();
    const t = window.setTimeout(() => setShake(false), 400);
    return () => window.clearTimeout(t);
  }, [verifyState]);

  // Resend result goes to a toast; success restarts the cooldown and resets the boxes.
  React.useEffect(() => {
    if (!resendState) return;
    if (resendState.ok) {
      setSeconds(RESEND_COOLDOWN);
      setCode("");
      setError(null);
      lastSubmitted.current = null;
      inputRef.current?.focus();
      toast({ variant: "success", title: "New code sent", description: email });
    } else if (resendState.error) {
      const limited = resendState.errorCode === "rate_limited";
      if (limited && resendState.retryAfterSeconds) setSeconds(resendState.retryAfterSeconds);
      toast({ variant: limited ? "warning" : "danger", title: resendState.error });
    }
  }, [resendState, toast, email]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setCode(event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH));
    if (error) setError(null);
  }

  // Keep the caret at the end so a click in the middle can't make typing replace a digit.
  function keepCaretAtEnd(event: React.SyntheticEvent<HTMLInputElement>) {
    const el = event.currentTarget;
    if (el.selectionStart !== el.value.length || el.selectionEnd !== el.value.length) {
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }

  function handleResend() {
    const fd = new FormData();
    fd.set("email", email);
    fd.set("next", next);
    React.startTransition(() => {
      void resendAction(fd);
    });
  }

  const activeIndex = Math.min(code.length, OTP_LENGTH - 1);

  return (
    <div className="zc-otp-block">
      <form
        className="zc-otp"
        onSubmit={(event) => {
          event.preventDefault();
          if (code.length === OTP_LENGTH && !verifying) {
            lastSubmitted.current = code;
            submit(code);
          }
        }}
      >
        <input
          ref={inputRef}
          className="zc-otp-input"
          value={code}
          onChange={handleChange}
          onSelect={keepCaretAtEnd}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          readOnly={verifying}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          autoCapitalize="none"
          spellCheck={false}
          aria-label="6-digit code"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "otp-error" : undefined}
        />
        <div className={`zc-otp-cells${shake ? " is-shake" : ""}`} aria-hidden="true">
          {Array.from({ length: OTP_LENGTH }, (_, i) => (
            <span
              key={i}
              className={[
                "zc-otp-cell",
                focused && !verifying && i === activeIndex ? "is-active" : "",
                code[i] ? "is-filled" : "",
                error ? "is-error" : "",
              ].join(" ")}
            >
              {code[i] ?? ""}
            </span>
          ))}
        </div>
      </form>

      <p className="zc-otp-msg" id="otp-error" role={error ? "alert" : "status"} data-tone={error ? "error" : "muted"}>
        {error ?? (verifying ? "Verifying…" : "")}
      </p>

      <button type="button" className="zc-pill-btn" disabled={seconds > 0 || resending || verifying} onClick={handleResend}>
        {resending ? "Sending…" : seconds > 0 ? `Resend code in ${seconds}s` : "Resend code"}
      </button>
    </div>
  );
}