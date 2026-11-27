"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  Search,
  Calendar,
  User,
  ArrowRight,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "@zerocraft/ui/toast";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@zerocraft/ui/button";
import { Input } from "@zerocraft/ui/input";
import { Label } from "@zerocraft/ui/label";
import { Textarea } from "@zerocraft/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@zerocraft/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@zerocraft/ui/select";
import { PriceInput } from "@/components/ui/price-input";
import { useDirtyForm } from "@/components/providers/dirty-provider";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

const giftCardSchema = z.object({
  code: z
    .string()
    .min(8, "Gift card code must be at least 8 characters long.")
    .max(32, "Gift card code must be at most 32 characters long.")
    .regex(/^[A-Za-z0-9-]+$/, "Use only letters, numbers and hyphens."),
  customer: z.string().min(1, "Select a customer."),
  recipient: z.string().optional(),
  recipientEmail: z.string().optional(),
  personalMessage: z.string().optional(),
  initialValue: z
    .string()
    .min(1, "Enter an initial value.")
    .refine((v) => Number(v.replace(/,/g, "")) > 0, {
      message: "Initial value must be greater than zero.",
    }),
  expiresAt: z.string().optional(),
});

type GiftCardFormValues = z.infer<typeof giftCardSchema>;

interface CustomerOption {
  id: string;
  name: string;
  email: string;
}

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const EXPIRY_OPTIONS: { value: string; label: string }[] = [
  { value: "never", label: "Doesn't expire" },
  { value: "1year", label: "1 year from now" },
  { value: "3years", label: "3 years from now" },
  { value: "5years", label: "5 years from now" },
];

function generateCode(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/* ------------------------------------------------------------------ */
/* Note dialog                                                        */
/* ------------------------------------------------------------------ */

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
}

function NoteDialog({
  open,
  onOpenChange,
  value,
  onChange,
}: NoteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger>
        <button
          type="button"
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-transparent text-[#616161] hover:bg-[#F6F6F7] transition-colors"
          aria-label="Add note"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] p-6">
        <DialogHeader>
          <DialogTitle>Add note</DialogTitle>
          <DialogDescription>
            Add an internal note for this gift card.
          </DialogDescription>
        </DialogHeader>
        <form className="mt-4 flex flex-col gap-4">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type a note…"
            className="h-32"
          />
          <div className="flex justify-end text-[11px] text-muted-foreground">
            {value.length}/5000
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Calendar popover                                                   */
/* ------------------------------------------------------------------ */

interface CalendarPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: Date | null;
  onSelect: (date: Date | null) => void;
}

function CalendarPopover({
  open,
  onOpenChange,
  selected,
  onSelect,
}: CalendarPopoverProps) {
  const [viewDate, setViewDate] = React.useState<Date>(selected ?? new Date());

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const daysInMonth = (y: number, m: number) =>
    new Date(y, m + 1, 0).getDate();

  const firstDayIndex = (y: number, m: number) =>
    new Date(y, m, 1).getDay();

  const isSameDay = (a: Date, b: Date) =>
    a.toDateString() === b.toDateString();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const isDisabled = (d: Date) => d.getTime() < todayStart.getTime();

  const days = daysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const start = firstDayIndex(viewDate.getFullYear(), viewDate.getMonth());

  const changeMonth = (delta: number) => {
    setViewDate(
      new Date(
        viewDate.getFullYear(),
        viewDate.getMonth() + delta,
        1,
      ),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger>
        <button type="button" style={{ display: "none" }} />
      </DialogTrigger>
      <DialogContent className="p-0 w-[340px] sm:w-[380px]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E1E3E5] bg-[#F6F6F7]">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="-mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-[#616161] hover:bg-[#E1E3E5]"
            aria-label="Previous month"
          >
            <Calendar className="size-4" />
          </button>
          <span className="text-sm font-medium text-foreground">
            {months[viewDate.getMonth()]} {viewDate.getFullYear()}
          </span>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="-ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-[#616161] hover:bg-[#E1E3E5]"
            aria-label="Next month"
          >
            <ArrowRight className="size-4" />
          </button>
        </div>
        <div className="px-4 py-3">
          <div className="grid w-full grid-cols-7 text-[11px] text-muted-foreground uppercase tracking-tighter">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="mt-2 grid w-full grid-cols-7 gap-1">
            {Array.from({ length: start }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {Array.from({ length: days }).map((_, i) => {
              const d = new Date(
                viewDate.getFullYear(),
                viewDate.getMonth(),
                i + 1,
              );
              const active = selected && isSameDay(d, selected);
              const disabled = isDisabled(d);
              return (
                <button
                  key={`day-${i}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onSelect(d);
                    onOpenChange(false);
                  }}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors",
                    disabled
                      ? "text-muted-foreground opacity-50"
                      : active
                        ? "bg-primary text-primary-foreground"
                        : "text-[#616161] hover:bg-[#F6F6F7]",
                  )}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
        <div className="px-4 py-2 border-t border-[#E1E3E5] bg-[#F6F6F7]">
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              onOpenChange(false);
            }}
            className="flex w-full items-center justify-center text-sm text-[#616161]"
          >
            Clear date
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function NewGiftCardPage() {
  const router = useRouter();

  const form = useForm<GiftCardFormValues>({
    resolver: zodResolver(giftCardSchema) as Resolver<
      GiftCardFormValues,
      unknown,
      GiftCardFormValues
    >,
    defaultValues: {
      code: generateCode(),
      customer: "",
      recipient: "",
      recipientEmail: "",
      personalMessage: "",
      initialValue: "10.00",
      expiresAt: "",
    },
  });

  const [noteOpen, setNoteOpen] = React.useState(false);
  const [noteValue, setNoteValue] = React.useState("");
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [expiresOption, setExpiresOption] = React.useState("never");
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  const customers: CustomerOption[] = [
    { id: "c_1", name: "Maran R", email: "maranpic@zoho.com" },
    { id: "c_2", name: "Sarah J", email: "sarah.j@example.com" },
    { id: "c_3", name: "Alex K", email: "alex.k@example.com" },
    { id: "c_4", name: "Priya M", email: "priya.m@example.com" },
    { id: "c_5", name: "David L", email: "david.l@example.com" },
  ];

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const onSubmit = async () => {
    try {
      toast.add({
        title: "Gift card created.",
        type: "success",
      });
      form.reset(form.getValues(), { keepErrors: false });
      router.push("/gift_cards");
    } catch {
      toast.add({
        title: "Something went wrong creating the gift card.",
        type: "error",
      });
    }
  };

  useDirtyForm({
    dirty: form.formState.isDirty,
    saving: false,
    label: "Unsaved changes",
    onDiscard: () => {
      form.reset();
      router.push("/gift_cards");
    },
    onSave: () => {
      void form.handleSubmit(onSubmit, () => {})();
    },
  });

  const expiresLabel =
    expiresOption === "never"
      ? "Doesn't expire"
      : expiresOption === "1year"
        ? "1 year from now"
        : expiresOption === "3years"
          ? "3 years from now"
          : "5 years from now";

  const expiresDisplay =
    expiresOption === "never"
      ? "Doesn't expire"
      : selectedDate
        ? format(selectedDate, "MMM d, yyyy")
        : expiresLabel;

  return (
    <PageHeader>
      <div className="gift-card-create-page relative min-h-full bg-white text-[#202223]">
        <div className="relative mx-auto flex max-w-[1088px] flex-col overflow-visible px-4 py-4 sm:px-0 lg:py-6">
          <div className="mb-6">
            <h1 className="text-[22px] font-semibold leading-7 tracking-[-0.02em] text-[#202223]">
              Create gift card
            </h1>
          </div>
          <form
            id="gift-card-form"
            onSubmit={form.handleSubmit(onSubmit, () => {})}
            className="grid gap-8 xl:grid-cols-[minmax(0,760px)_280px] xl:gap-12"
          >
            {/* Left column - main form */}
            <div className="space-y-8">
              <section className="rounded-xl border border-[#E1E3E5] bg-white p-6 shadow-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#616161]">
                  Gift card details
                </h2>
                <div className="mt-5 space-y-4">
                  <div>
                    <Label>Gift card code</Label>
                    <div className="mt-1 flex items-center gap-2 rounded-lg border border-[#E1E3E5] bg-[#F6F6F7] px-2.5 py-2">
                      <Input
                        {...form.register("code")}
                        className="flex-1 bg-transparent text-sm font-medium text-foreground outline-none"
                        placeholder="e.g. 7yg78dwxfyxxbgbc"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                          form.setValue("code", generateCode(), {
                            shouldValidate: true,
                          });
                        }}
                      >
                        <ArrowRight className="size-3.5" />
                      </Button>
                    </div>
                    {form.formState.errors.code && (
                      <p className="mt-1 text-[11px] text-destructive">
                        {form.formState.errors.code.message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Initial value</Label>
                      <div className="mt-1">
                        <PriceInput
                          {...form.register("initialValue")}
                          className="w-[260px]"
                        />
                      </div>
                      {form.formState.errors.initialValue && (
                        <p className="mt-1 text-[11px] text-destructive">
                          {form.formState.errors.initialValue.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Expiry date</Label>
                      <div className="mt-1 flex w-full items-center gap-2 rounded-lg border border-[#E1E3E5] bg-white px-2.5 py-2">
                        <Select
                          value={expiresOption}
                          onValueChange={(v) => {
                            setExpiresOption((v ?? "never") as
                              | "never"
                              | "1year"
                              | "3years"
                              | "5years");
                            setSelectedDate(null);
                            setCalendarOpen(false);
                          }}
                        >
                          <SelectTrigger className="flex-1 text-sm">
                            <SelectValue placeholder={expiresLabel} />
                          </SelectTrigger>
                          <SelectContent>
                            {EXPIRY_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {expiresOption !== "never" && (
                          <CalendarPopover
                            open={calendarOpen}
                            onOpenChange={setCalendarOpen}
                            selected={selectedDate}
                            onSelect={(date) => {
                              setSelectedDate(date);
                              setCalendarOpen(false);
                              if (date) {
                                const year = date.getFullYear();
                                const now = new Date();
                                const diffYears =
                                  year -
                                  now.getFullYear() -
                                  (now.getMonth() > date.getMonth() ||
                                  (now.getMonth() === date.getMonth() &&
                                    now.getDate() > date.getDate())
                                    ? 1
                                    : 0);
                                setExpiresOption(
                                  diffYears <= 1
                                    ? "1year"
                                    : diffYears <= 3
                                      ? "3years"
                                      : "5years",
                                );
                              }
                            }}
                          />
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Gift card expiration laws can vary by country.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-[#E1E3E5] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-[#616161]">
                    Delivery details
                  </h2>
                  <NoteDialog
                    open={noteOpen}
                    onOpenChange={setNoteOpen}
                    value={noteValue}
                    onChange={setNoteValue}
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Customer</Label>
                    <div className="mt-1 relative w-full">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        {...form.register("customer")}
                        placeholder="Search or create customer"
                        className="pl-10 text-sm"
                        onChange={(e) => {
                          form.setValue("customer", e.target.value, {
                            shouldValidate: true,
                          });
                          setSearchQuery(e.target.value);
                        }}
                      />
                      {searchQuery && (
                        <div className="absolute left-0 right-0 mt-1 z-20 rounded-xl border border-[#E1E3E5] bg-white shadow-sm overflow-hidden">
                          {filteredCustomers.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              No matching customers
                            </div>
                          ) : (
                            <div className="border-t">
                              {filteredCustomers.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-[#F6F6F7] transition-colors"
                                  onClick={() => {
                                    form.setValue("customer", c.name, {
                                      shouldValidate: true,
                                    });
                                    setSearchQuery("");
                                  }}
                                >
                                  <User className="size-4 shrink-0 text-[#616161]" />
                                  <div>
                                    <div className="font-medium">{c.name}</div>
                                    <div className="text-[11px] text-[#616161]">
                                      {c.email}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {form.formState.errors.customer && (
                      <p className="mt-1 text-[11px] text-destructive">
                        {form.formState.errors.customer.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Recipient</Label>
                    <Input
                      {...form.register("recipient")}
                      placeholder="Recipient name"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label>Recipient email</Label>
                    <Input
                      {...form.register("recipientEmail")}
                      type="email"
                      placeholder="name@example.com"
                      className="text-sm"
                    />
                    {form.formState.errors.recipientEmail && (
                      <p className="mt-1 text-[11px] text-destructive">
                        {form.formState.errors.recipientEmail.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Personal message</Label>
                    <Textarea
                      {...form.register("personalMessage")}
                      placeholder="A message for the recipient"
                      className="h-24"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="add-note"
                      type="checkbox"
                      checked={noteOpen}
                      onChange={() => setNoteOpen(!noteOpen)}
                      className="rounded border-[#E1E3E5] text-primary"
                    />
                    <label htmlFor="add-note" className="text-sm text-[#616161]">
                      Add note
                    </label>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    No notes
                  </p>
                </div>
              </section>
            </div>

            {/* Right column - side panel */}
            <div className="space-y-5 xl:sticky xl:top-6">
              <section className="rounded-xl border border-[#E1E3E5] bg-white p-6 shadow-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#616161] mb-4">
                  Summary
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#616161]">Gift card code</span>
                    <span className="font-medium text-foreground truncate">
                      {useWatch({ control: form.control, name: "code" })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#616161]">Initial value</span>
                    <span className="font-medium text-foreground">
                      ₹{useWatch({ control: form.control, name: "initialValue" }) || "0.00"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#616161]">Expiry date</span>
                    <span className="font-medium text-foreground">
                      {expiresDisplay}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#616161]">Customer</span>
                    <span className="font-medium text-foreground truncate">
                      {useWatch({ control: form.control, name: "customer" }) || "—"}
                    </span>
                  </div>
                </div>
              </section>
              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={form.formState.isSubmitting}
                >
                  Save gift card
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </PageHeader>
  );
}
