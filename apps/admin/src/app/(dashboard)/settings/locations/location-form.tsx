"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  createLocation,
  updateLocation,
} from "./actions";
import { Button } from "@zerocraft/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@zerocraft/ui/card";
import { Separator } from "@zerocraft/ui/separator";

const CODE_PATTERN = /^[A-Z0-9-]{3,20}$/;

const locationSchema = z.object({
  name: z.string().trim().min(2, "Location name must be at least 2 characters").max(120, "Location name must be at most 120 characters"),
  code: z.string().trim().min(1, "Location code is required").refine(
    (value) => CODE_PATTERN.test(value.toUpperCase()),
    "Location code must be uppercase alphanumeric or hyphen, 3-20 characters",
  ),
  address: z.string().trim().optional().or(z.literal("")),
  contact_phone: z.string().trim().max(20, "Phone is too long").optional().or(z.literal("")),
  contact_email: z.string().email("Enter a valid email address").max(254, "Email is too long").optional().or(z.literal("")),
});

type LocationFormValues = z.infer<typeof locationSchema>;

type LocationFormMode = "create" | "edit";

interface LocationFormProps {
  mode: LocationFormMode;
  location?: {
    id: string;
    name: string | null;
    code: string | null;
    address: Record<string, unknown> | null;
    contact_phone: string | null;
    contact_email: string | null;
  };
  onSuccess: () => void;
  onClose: () => void;
}

export default function LocationForm({
  mode,
  location,
  onSuccess,
  onClose,
}: LocationFormProps) {
  const addressValue =
    typeof location?.address === "object" &&
    location.address !== null &&
    "raw" in location.address
      ? String((location.address as { raw?: unknown }).raw ?? "")
      : typeof location?.address === "string"
        ? location.address
        : "";

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: location?.name ?? "",
      code: location?.code ?? "",
      address: addressValue,
      contact_phone: location?.contact_phone ?? "",
      contact_email: location?.contact_email ?? "",
    },
  });

  const isEdit = mode === "edit";
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onSubmit = async (values: LocationFormValues) => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const result = isEdit
        ? await updateLocation({ ...values, id: location!.id })
        : await createLocation(values);

      if (result.ok) {
        onSuccess();
      } else {
        setSubmitError(result.error);
      }
    } catch {
      setSubmitError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Location" : "Create Location"}</CardTitle>
        <CardDescription>
          {isEdit
            ? "Update location details. Organization and status cannot be changed here."
            : "Add a new store or branch location."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex w-full max-w-md flex-col gap-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-body">
                Location name
              </label>
              <input
                {...form.register("name")}
                placeholder="e.g. Downtown Store"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-body">
                Location code
              </label>
              <input
                {...form.register("code")}
                placeholder="e.g. DTN-01"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {form.formState.errors.code && (
                <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-body">
              Address
            </label>
            <input
              {...form.register("address", { shouldUnregister: true })}
              placeholder="e.g. 123 Main Street"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-body">
                Contact phone
              </label>
              <input
                {...form.register("contact_phone")}
                type="tel"
                placeholder="e.g. +91 98765 43210"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {form.formState.errors.contact_phone && (
                <p className="text-xs text-destructive">{form.formState.errors.contact_phone.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-body">
                Contact email
              </label>
              <input
                {...form.register("contact_email")}
                type="email"
                placeholder="e.g. store@example.com"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {form.formState.errors.contact_email && (
                <p className="text-xs text-destructive">{form.formState.errors.contact_email.message}</p>
              )}
            </div>
          </div>

          {submitError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
              {submitError}
            </div>
          )}

          <Separator className="mt-4 mb-4" />

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Location"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
