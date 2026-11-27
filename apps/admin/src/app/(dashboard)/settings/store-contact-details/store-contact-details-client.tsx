"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "@zerocraft/ui/toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@zerocraft/ui/card";
import { updateStoreContact } from "../actions";
import { useSettingsDirtyForm } from "@/components/providers/dirty-provider";

type Org = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};
type ContactValues = { name: string; email: string; phone: string };

export function StoreContactDetailsClient({ org }: { org: Org }) {
  const initial = React.useMemo<ContactValues>(
    () => ({
      name: org.name ?? "",
      email: org.email ?? "",
      phone: org.phone ?? "",
    }),
    [org],
  );
  const [values, setValues] = React.useState(initial);
  const [saved, setSaved] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const dirty =
    values.name !== saved.name ||
    values.email !== saved.email ||
    values.phone !== saved.phone;
  const set =
    (key: keyof ContactValues) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setValues((current) => ({ ...current, [key]: event.target.value }));

  function discardChanges() {
    setValues(saved);
  }

  async function save() {
    setSaving(true);
    const result = await updateStoreContact(values);
    setSaving(false);
    if (!result.ok) {
      toast.add({ title: result.error, type: "error" });
      return;
    }
    toast.add({ title: "Store contact details saved", type: "success" });
    setSaved({ ...values });
  }

  useSettingsDirtyForm({
    dirty,
    saving,
    onDiscard: discardChanges,
    onSave: () => void save(),
  });

  return (
    <div className="relative mx-auto w-full max-w-3xl px-4 py-16 space-y-10">
      <div className="p text-2xl font-semibold">
        <h2>Store contact details</h2>
      </div>
      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold">Store name</h2>
        <Card>
          <CardContent className="space-y-2">
            <label className="text-sm font-medium">Store name</label>
            <input
              value={values.name}
              onChange={set("name")}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Appears on your online store
            </p>
          </CardContent>
        </Card>
      </section>
      <section>
        <h2 className="mb-3 text-base font-semibold">Store contact details</h2>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Store email</CardTitle>
            <CardDescription>
              Receives messages about your store. For sender email go to
              notifications settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="email"
              value={values.email}
              onChange={set("email")}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
            <div>
              <label className="text-sm font-medium">Store phone</label>
              <input
                type="tel"
                value={values.phone}
                onChange={set("phone")}
                className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
          </CardContent>
        </Card>
        <p className="mt-3 text-sm text-muted-foreground">
          These details may be visible to customers through your policies and
          shared with apps, sales channels, and payment providers you use.{" "}
          <Link
            href="/settings/notifications"
            className="underline underline-offset-2"
          >
            Learn more
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
