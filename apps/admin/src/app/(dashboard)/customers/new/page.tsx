"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createCustomer } from "../actions";
import { useDirtyForm } from "@/components/providers/dirty-provider";
import {
  customerFormSchema,
  type CustomerFormValues,
} from "@/app/(dashboard)/customers/lib/customer-schema";
import Link from "next/link";
import { Button } from "@zerocraft/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@zerocraft/ui/card";
import { Input } from "@zerocraft/ui/input";
import { Checkbox } from "@zerocraft/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zerocraft/ui/select";
import { Label } from "@zerocraft/ui/label";
import { Plus, Tag, Edit, ArrowLeft, MoreHorizontal } from "lucide-react";

function FieldError({ error }: { error: string | undefined }) {
  if (!error) return null;
  return (
    <p className="text-[11px] text-destructive mt-1">{error}</p>
  );
}

export default function NewCustomerPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema) as Resolver<
      CustomerFormValues,
      unknown,
      CustomerFormValues
    >,
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      note: "",
      tags: [],
      tax_exempt: false,
      accepts_marketing: false,
      marketing_opt_in_level: "unknown",
      state: "enabled",
      default_address: null,
      addresses: [],
    },
  });

  const onSubmit = async (values: CustomerFormValues) => {
    form.clearErrors();
    setIsSubmitting(true);

    try {
      const result = await createCustomer(values);

      if (!result.ok) {
        form.setError("root.server", { message: result.error });
        return;
      }

      form.reset(form.getValues());
      router.push("/customers");
    } catch {
      form.setError("root.server", {
        message: "Something went wrong while saving this customer. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useDirtyForm({
    dirty: form.formState.isDirty,
    saving: isSubmitting,
    label: "Unsaved customer",
    onDiscard: () => {
      form.reset();
      router.push("/customers");
    },
    onSave: () => {
      void form.handleSubmit(onSubmit, () => {})();
    },
  });

  const fieldErrors = form.formState.errors;

  return (
    <div className="relative mx-auto flex max-w-[1088px] flex-col overflow-visible px-4 py-4 sm:px-0 lg:py-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/customers"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-body transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Back to Customers"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-[22px] font-semibold leading-7 tracking-[-0.02em] text-[#202223]">
          New customer
        </h1>
      </div>

      {/* Top action bar (floating)} */}
      <div className="flex justify-end gap-2 mb-8">
        <Button variant="outline" size="sm" disabled={!form.formState.isDirty}>
          Unsaved changes
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push("/customers")}>
          Discard
        </Button>
        <Button type="submit" form="customer-form" size="sm" disabled={isSubmitting} className="bg-[#202223] text-[#f6f6f7] hover:bg-[#202223]/90">
          Save
        </Button>
      </div>

      {fieldErrors.root?.server && (
        <div className="mb-6 p-3 rounded bg-destructive/10 border border-destructive/20 text-[12px] text-destructive">
          {fieldErrors.root.server.message}
        </div>
      )}

      <form
        id="customer-form"
        onSubmit={form.handleSubmit(onSubmit, () => {})}
        className="grid grid-cols-1 lg:grid-cols-4 gap-8"
      >
        {/* Main form column */}
        <div className="lg:col-span-3 space-y-6">
          {/* Customer overview */}
          <Card className="overflow-hidden border rounded-xl bg-[#ffffff]">
            <CardHeader className="flex flex-row items-center justify-between p-0 pb-0">
              <CardTitle className="text-[13px] font-medium text-[#202223]">
                Customer overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-0 space-y-6">
              <div className="grid grid-cols-2 gap-4 px-6">
                <div className="space-y-2">
                  <Label className="text-[11px] font-medium text-[#6b7280]">First name</Label>
                  <Input
                    {...form.register("first_name")}
                    placeholder="First name"
                    className={cn(
                      "w-full rounded-lg border border-[#e7e5e4] bg-transparent px-3 py-2.5 text-[#202223] placeholder:text-[#9ca3af] focus:border-[#0e7c7b] focus:ring-0 transition-colors",
                      fieldErrors.first_name ? "border-destructive" : ""
                    )}
                  />
                  <FieldError error={fieldErrors.first_name?.message} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-medium text-[#6b7280]">Last name</Label>
                  <Input
                    {...form.register("last_name")}
                    placeholder="Last name"
                    className={cn(
                      "w-full rounded-lg border border-[#e7e5e4] bg-transparent px-3 py-2.5 text-[#202223] placeholder:text-[#9ca3af] focus:border-[#0e7c7b] focus:ring-0 transition-colors",
                      fieldErrors.last_name ? "border-destructive" : ""
                    )}
                  />
                  <FieldError error={fieldErrors.last_name?.message} />
                </div>
              </div>

              <div className="space-y-2 px-6">
                <Label className="text-[11px] font-medium text-[#6b7280]">Language</Label>
                <Select
                  defaultValue="English [Default]"
                  onValueChange={() => {}}
                >
                  <SelectTrigger className="w-full rounded-lg border border-[#e7e5e4] bg-transparent px-3 py-2.5 text-[#202223] focus:border-[#0e7c7b] focus:ring-0 transition-colors">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English [Default]">English [Default]</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-[#6b7280] leading-5">
                  This customer will receive notifications in this language.
                </p>
              </div>

              <div className="space-y-2 px-6">
                <Label className="text-[11px] font-medium text-[#6b7280]">Email</Label>
                <Input
                  {...form.register("email")}
                  type="email"
                  placeholder="name@example.com"
                  className={cn(
                    "w-full rounded-lg border border-[#e7e5e4] bg-transparent px-3 py-2.5 text-[#202223] placeholder:text-[#9ca3af] focus:border-[#0e7c7b] focus:ring-0 transition-colors",
                    fieldErrors.email ? "border-destructive" : ""
                  )}
                />
                <FieldError error={fieldErrors.email?.message} />
              </div>

              <div className="space-y-2 px-6">
                <div className="flex items-center gap-2">
                  <Label className="text-[11px] font-medium text-[#6b7280]">Phone number</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    defaultValue="India (+91)"
                    onValueChange={() => {}}
                  >
                    <SelectTrigger className="rounded-lg border border-[#e7e5e4] bg-transparent px-3 py-2.5 text-[#202223] focus:border-[#0e7c7b] focus:ring-0 transition-colors w-[130px]">
                      <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="India (+91)">India (+91)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    {...form.register("phone")}
                    placeholder="Phone number"
                    className={cn(
                      "flex-1 rounded-lg border border-[#e7e5e4] bg-transparent px-3 py-2.5 text-[#202223] placeholder:text-[#9ca3af] focus:border-[#0e7c7b] focus:ring-0 transition-colors",
                      fieldErrors.phone ? "border-destructive" : ""
                    )}
                  />
                </div>
                <FieldError error={fieldErrors.phone?.message} />
              </div>

              <div className="space-y-2 px-6">
                <Checkbox
                  checked={form.getValues("accepts_marketing")}
                  onCheckedChange={(checked) => form.setValue("accepts_marketing", !!checked)}
                  className="rounded border-[#e7e5e4] text-[#0e7c7b] focus:ring-[#0e7c7b]"
                >
                  Customer agreed to receive marketing emails.
                </Checkbox>
                <Checkbox
                  defaultChecked={false}
                  onCheckedChange={() => {}}
                  className="rounded border-[#e7e5e4] text-[#6b7280] focus:ring-[#6b7280]"
                >
                  Customer agreed to receive SMS marketing text messages.
                </Checkbox>
                <Checkbox
                  defaultChecked={false}
                  onCheckedChange={() => {}}
                  className="rounded border-[#e7e5e4] text-[#6b7280] focus:ring-[#6b7280]"
                >
                  Customer agreed to receive WhatsApp marketing messages.
                </Checkbox>
                <p className="text-[11px] text-[#6b7280] leading-5 max-w-[64ch]">
                  You should ask your customers for permission before you subscribe them to your marketing emails, SMS, or WhatsApp messages.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Default address */}
          <Card className="overflow-hidden border rounded-xl bg-[#ffffff]">
            <CardHeader className="flex flex-row items-center justify-between p-0 pb-0">
              <div className="flex flex-col gap-0.5">
                <CardTitle className="text-[13px] font-medium text-[#202223]">Default address</CardTitle>
                <CardDescription className="text-[11px] text-[#6b7280]">
                  The primary address of this customer
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-0">
              <Button
                variant="outline"
                className="w-full px-6 py-4 text-left rounded-none border-0 bg-transparent hover:bg-[#f4f3f5] hover:text-[#202223] transition-colors"
                onClick={() => {}}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="flex items-center gap-2 text-[#202223]">
                    <Plus className="size-4" />
                    Add address
                  </span>
                  <MoreHorizontal className="size-4 text-[#6b7280]" />
                </div>
              </Button>
            </CardContent>
          </Card>

          {/* Tax details */}
          <Card className="overflow-hidden border rounded-xl bg-[#ffffff]">
            <CardHeader className="flex flex-row items-center justify-between p-0 pb-0">
              <CardTitle className="text-[13px] font-medium text-[#202223]">Tax details</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-0">
              <div className="space-y-2 px-6 pb-6">
                <Label className="text-[11px] font-medium text-[#6b7280]">Tax settings</Label>
                <Select
                  defaultValue="Collect tax"
                  onValueChange={() => {}}
                >
                  <SelectTrigger className="w-full rounded-lg border border-[#e7e5e4] bg-transparent px-3 py-2.5 text-[#202223] focus:border-[#0e7c7b] focus:ring-0 transition-colors">
                    <SelectValue placeholder="Select tax setting" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Collect tax">Collect tax</SelectItem>
                    <SelectItem value="Collect tax unless exemptions apply">Collect tax unless exemptions apply</SelectItem>
                    <SelectItem value="Don&apos;t collect tax">Don&apos;t collect tax</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Notes */}
          <Card className="overflow-hidden border rounded-xl bg-[#ffffff]">
            <CardHeader className="flex flex-row items-center justify-between p-0 pb-0">
              <div className="flex items-center gap-2">
                <Edit className="size-4 text-[#6b7280]" />
                <CardTitle className="text-[13px] font-medium text-[#202223]">Notes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-0">
              <p className="px-6 py-4 text-[11px] text-[#6b7280] leading-5">
                Notes are private and won&rsquo;t be shared with the customer.
              </p>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card className="overflow-hidden border rounded-xl bg-[#ffffff]">
            <CardHeader className="flex flex-row items-center justify-between p-0 pb-0">
              <CardTitle className="text-[13px] font-medium text-[#202223]">Tags</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-0">
              <Button
                variant="outline"
                className="w-full px-6 py-4 text-left rounded-none border-0 bg-transparent hover:bg-[#f4f3f5] hover:text-[#202223] transition-colors"
                onClick={() => {}}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="flex items-center gap-2 text-[#202223]">
                    <Tag className="size-4" />
                    Add tags
                  </span>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
