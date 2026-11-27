"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import type { Resolver, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "@zerocraft/ui/toast";

import { z } from "zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@zerocraft/ui/card";
import { Badge } from "@zerocraft/ui/badge";
import { Button } from "@zerocraft/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@zerocraft/ui/dialog";
import { Input } from "@zerocraft/ui/input";
import { Textarea } from "@zerocraft/ui/textarea";
import { Separator } from "@zerocraft/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@zerocraft/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@zerocraft/ui/tooltip";
import { Label } from "@zerocraft/ui/label";
import {
  MoreHorizontal,
  Mail,
  Phone,
  Edit,
  ShieldAlert,
} from "lucide-react";
import {
  formatCurrency,
  stateLabel,
  customerDisplayName,
  initials,
  CustomerRow,
} from "../types";
import { updateCustomer, archiveCustomer, enableCustomer } from "../actions";

const editCustomerSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  email: z.string().trim().min(1).max(320).email(),
  phone: z.string().trim().max(32).optional().or(z.literal("")).default(""),
  note: z.string().trim().max(5000).optional().or(z.literal("")).default(""),
  tags: z.array(z.string().trim().min(1)).default([]),
  tax_exempt: z.boolean().default(false),
  accepts_marketing: z.boolean().default(false),
  marketing_opt_in_level: z
    .enum(["unknown", "single_opt_in", "confirmed_opt_in", "unconfirmed_opt_in"])
    .default("unknown"),
  state: z
    .enum(["enabled", "disabled", "invited", "declined"])
    .default("enabled"),
});

export function CustomerDetail({
  customer,
  canManage,
}: {
  customer: CustomerRow;
  canManage: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = React.useState(false);

  const form = useForm<z.infer<typeof editCustomerSchema>>({
    resolver: zodResolver(editCustomerSchema) as Resolver<
      z.infer<typeof editCustomerSchema>,
      unknown,
      z.infer<typeof editCustomerSchema>
    >,
    defaultValues: {
      first_name: customer.first_name ?? "",
      last_name: customer.last_name ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      note: customer.note ?? "",
      tags: customer.tags,
      tax_exempt: customer.tax_exempt,
      accepts_marketing: customer.accepts_marketing,
      marketing_opt_in_level: customer.marketing_opt_in_level as "unknown" | "single_opt_in" | "confirmed_opt_in" | "unconfirmed_opt_in",
      state: customer.state as "enabled" | "disabled" | "invited" | "declined",
    },
  });

  const onSave = async (values: z.infer<typeof editCustomerSchema>) => {
    try {
      const result = await updateCustomer({
        id: customer.id,
        ...values,
      });
      if (result.ok) {
        toast.add({ title: "Customer updated.", type: "success" });
        setEditing(false);
        router.refresh();
      } else {
        toast.add({ title: result.error, type: "error" });
      }
    } catch {
      toast.add({ title: "Failed to update customer.", type: "error" });
    }
  };

  const handleArchive = async () => {
    try {
      const result = await archiveCustomer({ id: customer.id });
      if (result.ok) {
        toast.add({ title: "Customer disabled.", type: "success" });
        setArchiveDialogOpen(false);
        router.refresh();
      } else {
        toast.add({ title: result.error, type: "error" });
      }
    } catch {
      toast.add({ title: "Failed to disable customer.", type: "error" });
    }
  };

  const handleEnable = async () => {
    try {
      const result = await enableCustomer({ id: customer.id });
      if (result.ok) {
        toast.add({ title: "Customer enabled.", type: "success" });
        setArchiveDialogOpen(false);
        router.refresh();
      } else {
        toast.add({ title: result.error, type: "error" });
      }
    } catch {
      toast.add({ title: "Failed to enable customer.", type: "error" });
    }
  };

  const isDisabled = customer.state === "disabled";

  return (
    <div className="relative mx-auto flex max-w-[1088px] flex-col overflow-visible px-4 py-4 sm:px-0 lg:py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Profile */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header card */}
          <Card className="overflow-hidden space-y-0! py-0! gap-0">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                <div className="flex shrink-0 items-center justify-center w-16 h-16 rounded-full bg-muted text-[20px] font-semibold text-muted-foreground">
                  {initials(customer)}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-2xl font-extrabold tracking-tight text-[#202223]">
                      {customerDisplayName(customer)}
                    </h2>
                    <Badge
                      variant={
                        customer.state === "enabled"
                          ? "success"
                          : customer.state === "disabled"
                            ? "destructive"
                            : customer.state === "invited"
                              ? "warning"
                              : "secondary"
                      }
                    >
                      {stateLabel(customer.state)}
                    </Badge>
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="size-4 shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="size-4 shrink-0" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-end gap-2">
                  {canManage && (
                    <Button
                      size="sm"
                      onClick={() => setEditing(true)}
                    >
                      <Edit className="size-4 mr-2" />
                      Edit customer
                    </Button>
                  )}
                </div>
              </div>

              <Separator className="my-6" />

              {/* Key metrics */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="overflow-hidden space-y-0! py-0! gap-0 p-4">
                  <CardContent className="pt-5">
                    <div className="text-xs font-medium text-muted-foreground">
                      Amount spent
                    </div>
                    <div className="text-xl font-bold text-[#202223]">
                      {formatCurrency(Number(customer.total_spent || 0))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden space-y-0! py-0! gap-0 p-4">
                  <CardContent className="pt-5">
                    <div className="text-xs font-medium text-muted-foreground">
                      Orders
                    </div>
                    <div className="text-xl font-bold text-[#202223]">
                      {customer.orders_count}
                    </div>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden space-y-0! py-0! gap-0 p-4">
                  <CardContent className="pt-5">
                    <div className="text-xs font-medium text-muted-foreground">
                      Customer since
                    </div>
                    <div className="text-xl font-bold text-[#202223]">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Edit form (inline) */}
          {editing && (
            <EditCustomerForm
              form={form}
              onSave={onSave}
              onClose={() => setEditing(false)}
            />
          )}
        </div>

        {/* Right column: Contact, addresses, marketing, tax */}
        <div className="lg:col-span-4 space-y-6">
          {/* Contact information */}
          <Card className="overflow-hidden space-y-0! py-0! gap-0">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Contact information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex shrink-0 items-center justify-center w-6 h-6 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                  M
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#202223] truncate">
                    {customer.email || "No email"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Will receive notifications in English
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Has signed in
                  </p>
                </div>
                {customer.email && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Copy email"
                        >
                          <Mail className="size-4" />
                        </Button>
                      }
                    />
                    <TooltipContent>Copy email</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Default address */}
          <Card className="overflow-hidden space-y-0! py-0! gap-0">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Default address
              </CardTitle>
              <CardDescription>
                The primary address of this customer
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {customer.default_address ? (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="text-body font-medium">
                    {customer.default_address?.first_name || ""}{" "}
                    {customer.default_address?.last_name || ""}
                  </p>
                  <p>
                    {customer.default_address?.address1 || ""}{" "}
                    {customer.default_address?.address2
                      ? " " +
                        customer.default_address?.address2
                      : ""}
                  </p>
                  <p>
                    {customer.default_address?.city || ""},{" "}
                    {customer.default_address?.state || ""}{" "}
                    {customer.default_address?.zip
                      ? " " +
                        customer.default_address?.zip
                      : ""}
                  </p>
                  <p>
                    {customer.default_address?.country || ""}
                  </p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No default address
                </div>
              )}
            </CardContent>
          </Card>

          {/* Marketing subscriptions */}
          <Card className="overflow-hidden space-y-0! py-0! gap-0">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Marketing subscriptions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Not subscribed to any channels
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tax details */}
          <Card className="overflow-hidden space-y-0! py-0! gap-0">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Tax details</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Collect tax
                </span>
                <span className="text-sm font-medium text-[#202223]">
                  {customer.tax_exempt ? "Tax-exempt" : "Collect tax"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Store credit */}
          <Card className="overflow-hidden space-y-0! py-0! gap-0">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Store credit
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">None</span>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card className="overflow-hidden space-y-0! py-0! gap-0">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Tags</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {customer.tags && customer.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {customer.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground border border-transparent"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tags</p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="overflow-hidden space-y-0! py-0! gap-0">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Notes</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="text-sm text-muted-foreground">
                {customer.note || "No notes"}
              </div>
            </CardContent>
          </Card>

          {/* More actions */}
          <Card className="overflow-hidden space-y-0! py-0! gap-0">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                More actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                    >
                      <span>More actions</span>
                      <MoreHorizontal className="size-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onSelect={() => setArchiveDialogOpen(true)}
                  >
                    <ShieldAlert className="mr-2 size-4" />
                    {isDisabled ? "Enable customer" : "Disable customer"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>

          {/* Archive confirmation dialog */}
          <Dialog
            open={archiveDialogOpen}
            onOpenChange={setArchiveDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {isDisabled ? "Enable customer" : "Disable customer"}
                </DialogTitle>
                <DialogDescription>
                  {isDisabled
                    ? "Enabling this customer will allow them to place orders again."
                    : "Disabling this customer will prevent them from placing orders. Their order history and data will be preserved."}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  onClick={() => setArchiveDialogOpen(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={isDisabled ? handleEnable : handleArchive}
                  className="text-destructive"
                >
                  {isDisabled ? "Enable" : "Disable"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Edit customer form component
// ============================================================================

function EditCustomerForm({
  form,
  onSave,
  onClose,
}: {
  form: UseFormReturn<z.infer<typeof editCustomerSchema>>;
  onSave: (values: z.infer<typeof editCustomerSchema>) => void;
  onClose: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  return (
    <form
      onSubmit={form.handleSubmit(async (values: z.infer<typeof editCustomerSchema>) => {
        setIsSubmitting(true);
        try {
          await onSave(values);
        } finally {
          setIsSubmitting(false);
        }
      })}
      className="mt-4 space-y-4"
    >
      <Card className="overflow-hidden space-y-0! py-0! gap-0">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Edit customer</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>First name</Label>
            <Input
              {...form.register("first_name")}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label>Last name</Label>
            <Input
              {...form.register("last_name")}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              {...form.register("email")}
              type="email"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone number</Label>
            <Input
              {...form.register("phone")}
              className="w-full"
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Note</Label>
            <Textarea
              {...form.register("note")}
              rows={3}
              className="max-w-[64ch]"
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Tags</Label>
            <p className="text-xs text-muted-foreground">
              Comma-separated tags
            </p>
            <Input
              {...form.register("tags", {
                setValueAs: (v: unknown) => {
                  if (typeof v !== "string") return [];
                  return v
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean);
                },
              })}
              placeholder="Add tags..."
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            Save
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
