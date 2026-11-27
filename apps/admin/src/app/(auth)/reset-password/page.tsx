"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@zerocraft/ui/button";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .regex(
        /^(?=.*[a-zA-Z])(?=.*[0-9])/,
        "Password must contain letters and digits",
      ),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const supabase = createBrowserSupabaseClient();

  async function handleSubmit(values: ResetPasswordFormValues) {
    setError(null);
    setLoading(true);

    try {
      const { error: supabaseError } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (supabaseError) {
        setError("Unable to reset password. Please request a new link.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Unable to reset password. Please request a new link.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto flex h-full w-full flex-col items-center justify-center">
        <div className="mx-auto flex max-w-[340px] flex-col items-center text-center">
          <div
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-success text-[13px] font-bold text-success-fg mb-6"
          >
            ✓
          </div>
          <h2 className="text-sm font-semibold tracking-[-0.02em]">
            Password updated
          </h2>
          <p className="mt-2 text-2xs text-meta">
            Your password has been changed. You can now sign in.
          </p>
          <Button
            render={
              <Link href="/login" className="text-sm">
                Back to login
              </Link>
            }
            variant="outline"
            className="mt-6 w-auto"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full flex-col items-center justify-center">
      <div className="mx-auto flex max-w-[340px] flex-col">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand text-[13px] font-bold text-brand-fg"
          >
            M
          </div>
          <p className="text-sm font-semibold tracking-[-0.02em]">
            Maara Merch
          </p>
        </div>

        <h2 className="mb-6 text-sm font-semibold tracking-[-0.02em]">
          Set a new password
        </h2>
        <p className="mb-8 text-2xs text-meta">
          Choose a strong password. It must be at least 12 characters with
          letters and digits.
        </p>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-2xs font-semibold text-meta"
            >
              New password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••••••"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-2xs text-destructive">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="confirmPassword"
              className="text-2xs font-semibold text-meta"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••••••"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              {...form.register("confirmPassword")}
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-2xs text-destructive">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {error}
            </div>
          )}

          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading ? "Updating…" : "Update password"}
          </Button>
        </form>

        <p className="mt-6 text-center text-2xs text-meta">
          Didn&rsquo;t receive a link?{" "}
          <Link
            href="/forgot-password"
            className="text-brand underline-offset-4 hover:underline"
          >
            Request again
          </Link>
        </p>
      </div>
    </div>
  );
}
