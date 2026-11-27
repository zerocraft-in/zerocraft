"use client";

import * as React from "react";
import { toast } from "@zerocraft/ui/toast";
import { Button } from "@zerocraft/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@zerocraft/ui/dialog";
import { updateStoreAddress } from "./actions";

const STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Assam",
  "Bihar",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

type Address = {
  companyName?: string;
  street?: string;
  apartment?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
};

export function EditStoreAddressDialog({
  open,
  onOpenChange,
  address,
  country = "India",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: Address | null;
  country?: string | null;
}) {
  const [values, setValues] = React.useState({
    companyName: address?.companyName ?? "",
    street: address?.street ?? "",
    apartment: address?.apartment ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "",
    zip: address?.zip ?? "",
    country: address?.country ?? country ?? "India",
  });
  const [saving, setSaving] = React.useState(false);
  const set =
    (key: keyof typeof values) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((current) => ({ ...current, [key]: event.target.value }));
  async function save() {
    setSaving(true);
    const result = await updateStoreAddress(values);
    setSaving(false);
    if (!result.ok) {
      toast.add({ title: result.error, type: "error" });
      return;
    }
    toast.add({ title: "Store address saved", type: "success" });
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] gap-0 p-0">
        <DialogHeader className="border-b px-6 py-5 text-left">
          <DialogTitle>Edit store address</DialogTitle>
          <DialogDescription className="pt-2">
            Your customers can see this information.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="text-sm font-medium">Company name</label>
            <input
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value=""
              placeholder="Optional"
              onChange={() => undefined}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Country/region</label>
            <select
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={values.country}
              onChange={set("country")}
            >
              <option>India</option>
              <option>United States</option>
              <option>United Kingdom</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Change country in business details.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Address</label>
            <input
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={values.street}
              onChange={set("street")}
              placeholder="Street address"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Apartment, suite, etc</label>
            <input
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={values.apartment}
              onChange={set("apartment")}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">City</label>
              <input
                className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={values.city}
                onChange={set("city")}
              />
            </div>
            <div>
              <label className="text-sm font-medium">State</label>
              <select
                className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={values.state}
                onChange={set("state")}
              >
                <option value="">Select a state</option>
                {STATES.map((state) => (
                  <option key={state}>{state}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">PIN code</label>
              <input
                className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={values.zip}
                onChange={set("zip")}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
