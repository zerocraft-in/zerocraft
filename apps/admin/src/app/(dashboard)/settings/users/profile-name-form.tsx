"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { updateMyProfileName } from "./profile-actions";
import { Button } from "@zerocraft/ui/button";

const MAX_PROFILE_NAME_LENGTH = 100;

const profileNameSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Enter your name")
    .max(
      MAX_PROFILE_NAME_LENGTH,
      `Name must be ${MAX_PROFILE_NAME_LENGTH} characters or fewer`,
    ),
});

type ProfileNameFormValues = z.infer<typeof profileNameSchema>;

/**
 * Lets the signed-in user set the display name shown next to their entry in
 * the team list. The row to update is resolved on the server from the
 * verified session, so nothing about ownership is trusted from the browser.
 */
export default function ProfileNameForm({
  currentName,
}: {
  currentName: string;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const form = useForm<ProfileNameFormValues>({
    resolver: zodResolver(profileNameSchema),
    defaultValues: { fullName: currentName },
  });

  async function handleSubmit(values: ProfileNameFormValues) {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await updateMyProfileName(values.fullName);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      form.reset({ fullName: values.fullName.trim() });
      setSuccess("Display name saved.");
      // Re-render the server components so the team member row shows the new
      // name and avatar initial straight away.
      router.refresh();
    } catch {
      setError("Unable to save your name. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="flex w-full max-w-md flex-col gap-3"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="fullName" className="text-xs font-semibold text-body">
          Display name
        </label>
        <input
          id="fullName"
          type="text"
          autoComplete="name"
          maxLength={MAX_PROFILE_NAME_LENGTH}
          placeholder="Your name"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          {...form.register("fullName")}
        />
        {form.formState.errors.fullName && (
          <p className="text-2xs text-destructive">
            {form.formState.errors.fullName.message}
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

      {success && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-success bg-success/10 px-3 py-2 text-xs text-success"
        >
          {success}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save name"}
        </Button>
        <p className="text-2xs text-meta">
          Shown next to your entry in the team list.
        </p>
      </div>
    </form>
  );
}
