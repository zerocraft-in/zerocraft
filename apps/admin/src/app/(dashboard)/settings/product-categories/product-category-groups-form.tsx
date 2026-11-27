"use client";

import * as React from "react";
import { Button } from "@zerocraft/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zerocraft/ui/card";
import { saveOrganizationTaxonomyRoots } from "../taxonomy-actions";

type Root = { id: string; name: string; vertical_prefix: string };
type Props = { roots: Root[]; enabledIds: string[]; canManage: boolean };

export function ProductCategoryGroupsForm({ roots, enabledIds, canManage }: Props) {
  const [selected, setSelected] = React.useState<string[]>(enabledIds);
  const [message, setMessage] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function toggle(id: string, checked: boolean) {
    setSelected((current) => checked ? [...current, id] : current.filter((value) => value !== id));
    setMessage(null);
  }

  function save() {
    startTransition(async () => {
      const result = await saveOrganizationTaxonomyRoots(selected);
      setMessage(result.ok ? "Product category groups saved." : result.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product category groups</CardTitle>
        <CardDescription>
          Choose which taxonomy groups are available in this organization’s product category picker.
          The taxonomy itself stays shared; only these enabled groups are organization-specific.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {roots.map((root) => (
            <label key={root.id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-muted/40">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-primary"
                checked={selected.includes(root.id)}
                disabled={!canManage || pending}
                onChange={(event) => toggle(root.id, event.target.checked)}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{root.name}</span>
                <span className="block text-xs text-muted-foreground">Taxonomy · {root.vertical_prefix}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <p aria-live="polite" className="text-xs text-muted-foreground">
            {message ?? (canManage ? `${selected.length} of ${roots.length} groups enabled` : "You can view these settings but cannot change them.")}
          </p>
          {canManage && (
            <Button type="button" onClick={save} disabled={pending || selected.length === 0 || selected.length === enabledIds.length && selected.every((id) => enabledIds.includes(id))}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
