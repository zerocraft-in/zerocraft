"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isSafeReturnPath } from "@/lib/domains";
import { Button } from "@zerocraft/components/ui/button";
import { Input } from "@zerocraft/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@zerocraft/components/ui/card";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const requestInFlight = useRef(false);
  const next = isSafeReturnPath(searchParams.get("next"), "/");

  async function sendCode() {
    const response = await fetch("/api/platform/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ email }),
    });
    const result = await response.json().catch(() => null) as { error?: string; sent?: boolean } | null;
    if (!response.ok || !result?.sent) {
      throw new Error(result?.error || "We could not send your sign-in code. Please retry.");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (sent) {
        const response = await fetch("/api/platform/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ email, token, next }),
        });
        const result = await response.json().catch(() => null) as { error?: string; next?: string } | null;
        if (!response.ok) throw new Error(result?.error || "The code could not be verified. Check it and try again.");
        if (!result?.next) throw new Error("Sign-in succeeded, but no destination was returned. Please retry.");
        // The verification endpoint writes the platform session cookie before this navigation.
        window.location.replace(result.next);
      } else {
        await sendCode();
        setSent(true);
      }
    } catch (cause) {
      const authError = cause as { message?: string; status?: number; code?: string };
      if (sent) {
        setError(authError.message || "The code could not be verified. Check it and try again.");
      } else if (authError.status === 500) {
        setError(`The platform Auth service returned HTTP 500 while sending the code${authError.code ? ` (${authError.code})` : ""}. Check the platform project's Auth logs, SMTP delivery, and email template. ${authError.message || ""}`.trim());
      } else {
        setError(authError.message || "We could not send your sign-in code. Please retry.");
      }
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-[#f1f1f1] p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          <p className="mb-3 text-sm font-semibold tracking-tight">ZEROCRAFT</p>
          <CardTitle>Sign in to your stores</CardTitle>
          <CardDescription>
            One owner account for all your stores and isolated databases.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm">
              Email
              <Input
                className="mt-2"
                type="email"
                autoComplete="email"
                required
                value={email}
                disabled={sent}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            {sent && (
              <label className="block text-sm">
                Email code
                <Input
                  className="mt-2"
                  autoComplete="one-time-code"
                  required
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                />
              </label>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
            <Button type="submit" disabled={busy}>
              {busy ? "Please wait…" : sent ? "Verify and continue" : "Continue with email"}
            </Button>
            {sent && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                className="ml-2"
                onClick={async () => {
                  if (requestInFlight.current) return;
                  requestInFlight.current = true;
                  setBusy(true);
                  setToken("");
                  setError("");
                  setNotice("");
                  try {
                    await sendCode();
                    setNotice("A new sign-in code was sent. Use the newest email code.");
                  } catch (cause) {
                    setError(cause instanceof Error ? cause.message : "We could not send a new code. Please retry.");
                  } finally {
                    requestInFlight.current = false;
                    setBusy(false);
                  }
                }}
              >
                Resend code
              </Button>
            )}
            {sent && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setSent(false);
                  setToken("");
                  setError("");
                  setNotice("");
                }}
              >
                Use another email
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
