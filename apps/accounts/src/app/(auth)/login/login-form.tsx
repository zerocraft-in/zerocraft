"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import {
  startEmailAuth,
  startOAuth,
  type AuthActionState,
} from "@/lib/auth/actions";
import { GoogleIcon, AppleIcon } from "@/components/auth/provider-icons";

type LoginFormProps = {
  next: string;
  initialError?: string;
  googleEnabled: boolean;
  appleEnabled: boolean;
  loggedOut?: boolean;
};

function FormSubmit({
  children,
  pendingLabel,
  className = "",
  name,
  value,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={`auth-button ${className}`}
      type="submit"
      disabled={pending}
      name={name}
      value={value}
    >
      {pending ? (
        <>
          <span className="auth-spinner" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

function Notice({
  children,
  variant = "error",
}: {
  children: React.ReactNode;
  variant?: "error" | "success" | "info";
}) {
  return (
    <p
      className={`auth-notice auth-notice--${variant}`}
      role={variant === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {children}
    </p>
  );
}

export function LoginForm({
  next,
  initialError,
  googleEnabled,
  appleEnabled,
  loggedOut = false,
}: LoginFormProps) {
  const router = useRouter();
  const [emailState, emailAction] = React.useActionState<
    AuthActionState,
    FormData
  >(startEmailAuth, null);
  const [oauthState, oauthAction] = React.useActionState<
    AuthActionState,
    FormData
  >(startOAuth, null);
  const [email, setEmail] = React.useState(emailState?.email ?? "");
  const [editedEmail, setEditedEmail] = React.useState(false);

  const emailError = editedEmail ? undefined : emailState?.error;
  const rateLimited = !editedEmail && emailState?.errorCode === "rate_limited";
  const oauthError = initialError ?? oauthState?.error;
  const hasSocial = googleEnabled || appleEnabled;

  // Handle successful email auth: navigate based on user type.
  React.useEffect(() => {
    if (!emailState?.ok || !emailState.email) return;
    if (emailState.userType === "existing") {
      router.push(
        `/otp?email=${encodeURIComponent(emailState.email)}&next=${encodeURIComponent(next)}`,
      );
    } else {
      // New user: magic link sent. Go to verify page.
      router.push(
        `/verify?email=${encodeURIComponent(emailState.email)}&next=${encodeURIComponent(next)}&sent=${emailState.magicLinkSent !== false ? "1" : "0"}`,
      );
    }
  }, [emailState, next, router]);

  function handleEmailChange(event: React.ChangeEvent<HTMLInputElement>) {
    setEmail(event.target.value);
    setEditedEmail(true);
  }

  return (
    <motion.section
      className="auth-content"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <div className="auth-mark" aria-label="Zerocraft">
        Z
      </div>

      <h1 className="auth-title">
        <span>Welcome to Zerocraft</span>
        <span className="auth-subtitle">
          Your workspace starts here. Sign in or create your account to
          continue.
        </span>
      </h1>

      <div className="auth-statuses">
        {loggedOut && (
          <Notice variant="info">You&apos;ve been signed out.</Notice>
        )}
      </div>

      {hasSocial && (
        <>
          <form action={oauthAction} className="auth-form">
            <input type="hidden" name="next" value={next} />
            {googleEnabled && (
              <FormSubmit
                pendingLabel="Opening..."
                className="auth-button--light"
                name="provider"
                value="google"
              >
                <GoogleIcon className="auth-provider-icon" />
                Continue with Google
              </FormSubmit>
            )}
            {appleEnabled && (
              <FormSubmit
                pendingLabel="Opening..."
                className="auth-button--light"
                name="provider"
                value="apple"
              >
                <AppleIcon className="auth-provider-icon" />
                Continue with Apple
              </FormSubmit>
            )}
            {oauthError && <Notice>{oauthError}</Notice>}
          </form>

          <div className="auth-divider">
            <span>OR</span>
          </div>
        </>
      )}

      <form
        action={emailAction}
        className="auth-form"
        noValidate
        onSubmit={() => setEditedEmail(false)}
      >
        <input type="hidden" name="next" value={next} />
        <div className="auth-field">
          <label className="auth-visually-hidden" htmlFor="login-email">
            Email address
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Enter your email address"
            required
            value={email}
            onChange={handleEmailChange}
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? "login-email-error" : undefined}
            className={`auth-input${emailError ? " is-invalid" : ""}`}
          />
          {emailError && (
            <p id="login-email-error" className="auth-field-error" role="alert">
              {emailError}
            </p>
          )}
          {rateLimited && emailState?.retryAfterSeconds != null && (
            <p className="auth-field-error">
              Try again in {emailState.retryAfterSeconds} seconds.
            </p>
          )}
        </div>
        <FormSubmit pendingLabel="Sending...">Continue with email</FormSubmit>
      </form>

      <p className="auth-legal">
        By continuing you agree to the <a href="/terms">Terms</a> and{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>
    </motion.section>
  );
}
