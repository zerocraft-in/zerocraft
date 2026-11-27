"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutGrid,
  Download,
  AlertCircle,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@zerocraft/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@zerocraft/ui/dialog";
import { Input } from "@zerocraft/ui/input";
import { Label } from "@zerocraft/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@zerocraft/ui/select";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@zerocraft/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zerocraft/ui/table";
import { Checkbox } from "@zerocraft/ui/checkbox";
import { Badge } from "@zerocraft/ui/badge";
import { toast } from "@zerocraft/ui/toast";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type GiftCardStatus = "active" | "disabled" | "expired";

interface GiftCard {
  id: string;
  code: string;
  customer: string;
  recipient: string | null;
  recipientEmail: string | null;
  personalMessage: string | null;
  expiresAt: string | null;
  createdAt: string;
  initialValue: number;
  currentBalance: number;
  currency: string;
  status: GiftCardStatus;
}

type StatusFilter = "all" | "active" | "disabled" | "expired";

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All",
  active: "Active",
  disabled: "Disabled",
  expired: "Expired",
};

const STATUS_COLORS: Record<GiftCardStatus, { bg: string; text: string }> = {
  active: { bg: "#AEE9B5", text: "#14532D" },
  disabled: { bg: "#F6F6F7", text: "#616161" },
  expired: { bg: "#F6F6F7", text: "#616161" },
};

/* ------------------------------------------------------------------ */
/* Mock data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_GIFT_CARDS: GiftCard[] = [
  {
    id: "gc_1",
    code: "ABCD-cbmw-EFGH",
    customer: "Maran R",
    recipient: null,
    recipientEmail: null,
    personalMessage: null,
    expiresAt: null,
    createdAt: new Date().toISOString(),
    initialValue: 2000,
    currentBalance: 2000,
    currency: "INR",
    status: "active",
  },
];

/* ------------------------------------------------------------------ */
/* Gift illustration                                                  */
/* ------------------------------------------------------------------ */

function GiftIllustration({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-24 items-center justify-center rounded-[var(--radius-lg)] bg-[#7fcfbf]",
        className,
      )}
      aria-hidden="true"
    >
      {/* ribbon vertical */}
      <div className="absolute inset-y-0 w-[18%] bg-[#2f9e8e] rounded-s-[var(--radius-lg)] rounded-e-[var(--radius-lg)]" />
      {/* ribbon horizontal */}
      <div className="absolute inset-x-0 h-[18%] bg-[#2f9e8e] rounded-t-[var(--radius-lg)] rounded-b-[var(--radius-lg)]" />
      {/* bow knot center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[14px] rounded-full bg-[#2f9e8e]" />
      {/* bow loops */}
      <div className="absolute top-[28%] left-1/2 -translate-x-1/2 size-[22px] rounded-full bg-[#7fcfbf]" />
      <div className="absolute top-[-4px] left-[2px] size-[14px] rounded-full bg-[#2f9e8e]" />
      <div className="absolute top-[-4px] right-[2px] size-[14px] rounded-full bg-[#2f9e8e]" />
      {/* gift code tag */}
      <svg
        className="absolute bottom-2 left-2 size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Status badge                                                       */
/* ------------------------------------------------------------------ */

function GiftCardStatusBadge({ status }: { status: GiftCardStatus }) {
  const color = STATUS_COLORS[status];
  return (
    <Badge
      variant="outline"
      className={`bg-[${color.bg}] text-[${color.text}] border-transparent`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                        */
/* ------------------------------------------------------------------ */

function GiftCardsEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center justify-center gap-6"
    >
      <div className="flex w-full max-w-2xl flex-col items-center justify-center min-h-[300px] rounded-xl border border-[#E1E3E5] bg-white p-8 shadow-sm text-center">
        <GiftIllustration className="mb-2" />
        <h2 className="text-base font-semibold text-foreground">
          Start selling gift cards
        </h2>
        <p className="mt-2 text-sm text-[#616161] leading-relaxed max-w-md">
          Add gift card products to sell or create gift cards and send them
          directly to your customers.
        </p>
        <div className="mt-6 flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {}}>
            Create gift card
          </Button>
          <Button
            size="sm"
            render={<Link href="/products/new" />}
          >
            Add gift card product
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Learn more about gift cards{" "}
        <Link
          href="#"
          className="font-medium text-primary underline underline-offset-4 hover:text-primary"
        >
          Help center
        </Link>
      </p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Informational banner                                               */
/* ------------------------------------------------------------------ */

function GiftCardsBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex w-full items-center gap-3 rounded-lg border border-[#b3e7f5] bg-[#DDF5FA] p-3 text-sm text-[#1f3a46]"
    >
      <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
      <p className="flex-1 leading-relaxed">
        You created a gift card. You can also sell gift card products for
        customers to buy on your store.
      </p>
      <Button size="sm" render={<Link href="/products/new" />}>
        Add gift card product
      </Button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Toolbar                                                            */
/* ------------------------------------------------------------------ */

interface GiftCardsToolbarProps {
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

function GiftCardsToolbar({
  statusFilter,
  onStatusFilterChange,
  search,
  onSearchChange,
}: GiftCardsToolbarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-[#E1E3E5] bg-white px-2 py-1.5">
          <Select
            value={statusFilter}
            onValueChange={(v) =>
              onStatusFilterChange((v ?? "all") as StatusFilter)
            }
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              {["all", "active", "disabled", "expired"].map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s as StatusFilter]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search and filter"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>
      </div>
      <button
        type="button"
        className="flex size-9 items-center justify-center rounded-lg border border-transparent bg-[#F6F6F7] text-[#616161] hover:bg-[#E1E3E5] transition-colors"
        aria-label="Table view options"
      >
        <LayoutGrid className="size-4" />
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Table row                                                          */
/* ------------------------------------------------------------------ */

interface GiftCardRowProps {
  card: GiftCard;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
}

function GiftCardRow({ card, isSelected, onSelect }: GiftCardRowProps) {
  const codeEnding = card.code.split("-").pop() ?? card.code;

  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      key={card.id}
      className="group"
    >
      <TableCell className="[&:has([role=checkbox])]:pr-0">
        <Checkbox
          checked={isSelected}
          onChange={(checked) => onSelect(card.id, checked === true)}
          aria-label={`Select ${card.code}`}
        />
      </TableCell>
      <TableCell className="font-medium text-foreground">
        <span className="text-sm font-medium">{codeEnding}</span>
      </TableCell>
      <TableCell>
        <GiftCardStatusBadge status={card.status} />
      </TableCell>
      <TableCell className="text-sm text-foreground">{card.customer}</TableCell>
      <TableCell className="text-sm text-[#616161]">
        {card.recipient ?? "No recipient"}
      </TableCell>
      <TableCell className="text-sm text-[#616161]">
        <span className="text-xs">Just now</span>
      </TableCell>
      <TableCell className="text-sm text-[#616161]">
        <div className="text-[#616161]">
          {new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: card.currency,
          }).format(card.currentBalance / 100)}
        </div>
        <div className="text-[11px] text-[#616161]">
          {new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: card.currency,
          }).format(card.initialValue / 100)}
        </div>
      </TableCell>
    </motion.tr>
  );
}

/* ------------------------------------------------------------------ */
/* Table                                                              */
/* ------------------------------------------------------------------ */

interface GiftCardsTableProps {
  cards: GiftCard[];
  selectedIds: Set<string>;
  onSelect: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
}

function GiftCardsTable({
  cards,
  selectedIds,
  onSelect,
  onSelectAll,
}: GiftCardsTableProps) {
  const allSelected =
    cards.length > 0 && cards.every((c) => selectedIds.has(c.id));

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="overflow-x-auto"
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F6F6F7]">
              <TableHead className="w-[44px] [&:has([role=checkbox])]:pr-0">
                <Checkbox
                  checked={allSelected}
                  onChange={(checked) => onSelectAll(checked === true)}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="text-sm font-medium text-foreground">
                Code ending
              </TableHead>
              <TableHead className="text-sm font-medium text-foreground">
                Status
              </TableHead>
              <TableHead className="text-sm font-medium text-foreground">
                Customer
              </TableHead>
              <TableHead className="text-sm font-medium text-foreground">
                Recipient
              </TableHead>
              <TableHead className="text-sm font-medium text-foreground">
                Created
              </TableHead>
              <TableHead className="text-sm font-medium text-foreground text-right">
                Current / Initial
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cards.map((card) => (
              <GiftCardRow
                key={card.id}
                card={card}
                isSelected={selectedIds.has(card.id)}
                onSelect={onSelect}
              />
            ))}
            {cards.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 flex items-center justify-center text-sm text-muted-foreground"
                >
                  No gift cards found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </motion.div>
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Create gift card dialog                                            */
/* ------------------------------------------------------------------ */

interface CreateGiftCardFormData {
  initialValue: string;
  customer: string;
  recipient: string;
  recipientEmail: string;
  personalMessage: string;
  expiresAt: string;
  expiresNever: boolean;
}

function CreateGiftCardDialogContent({
  onCreate,
  onClose,
}: {
  onCreate: (card: Omit<GiftCard, "id" | "code" | "createdAt">) => void;
  onClose: () => void;
}) {
  const [form, setForm] = React.useState<CreateGiftCardFormData>({
    initialValue: "",
    customer: "",
    recipient: "",
    recipientEmail: "",
    personalMessage: "",
    expiresAt: "",
    expiresNever: true,
  });
  const [errors, setErrors] = React.useState<Partial<
    Record<keyof CreateGiftCardFormData, string>
  >>({});

  const validate = () => {
    const next: Partial<Record<keyof CreateGiftCardFormData, string>> = {};
    if (!form.initialValue || Number(form.initialValue) <= 0) {
      next.initialValue = "Enter a valid amount.";
    }
    if (!form.customer.trim()) {
      next.customer = "Customer is required.";
    }
    if (!form.recipientEmail.trim()) {
      next.recipientEmail = "Recipient email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.recipientEmail)) {
      next.recipientEmail = "Enter a valid email address.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    onCreate({
      initialValue: Number(form.initialValue) * 100,
      customer: form.customer.trim(),
      recipient: form.recipient.trim() || null,
      recipientEmail: form.recipientEmail.trim(),
      personalMessage: form.personalMessage.trim() || null,
      expiresAt: form.expiresNever ? null : form.expiresAt,
      currentBalance: Number(form.initialValue) * 100,
      currency: "INR",
      status: "active",
    });
    setForm({
      initialValue: "",
      customer: "",
      recipient: "",
      recipientEmail: "",
      personalMessage: "",
      expiresAt: "",
      expiresNever: true,
    });
    setErrors({});
    onClose();
    toast.success("Gift card created");
  };

  return (
    <DialogContent className="sm:max-w-[480px] p-6">
        <DialogHeader>
          <DialogTitle>Create gift card</DialogTitle>
          <DialogDescription>
            Set the initial value and delivery details for a new gift card.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Initial value</Label>
              <InputGroup>
                <InputGroupAddon>₹</InputGroupAddon>
                <InputGroupInput
                  type="number"
                  placeholder="0.00"
                  value={form.initialValue}
                  onChange={(e) =>
                    setForm({ ...form, initialValue: e.target.value })
                  }
                  className="text-sm"
                />
              </InputGroup>
              {errors.initialValue && (
                <p className="text-[11px] text-destructive">{errors.initialValue}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Customer</Label>
              <Input
                value={form.customer}
                onChange={(e) =>
                  setForm({ ...form, customer: e.target.value })
                }
                placeholder="Search or select a customer"
                className="text-sm"
              />
              {errors.customer && (
                <p className="text-[11px] text-destructive">{errors.customer}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Recipient</Label>
            <Input
              value={form.recipient}
              onChange={(e) =>
                setForm({ ...form, recipient: e.target.value })
              }
              placeholder="Recipient name"
              className="text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Recipient email</Label>
            <Input
              type="email"
              value={form.recipientEmail}
              onChange={(e) =>
                setForm({ ...form, recipientEmail: e.target.value })
              }
              placeholder="name@example.com"
              className="text-sm"
            />
            {errors.recipientEmail && (
              <p className="text-[11px] text-destructive">{errors.recipientEmail}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Personal message</Label>
            <textarea
              value={form.personalMessage}
              onChange={(e) =>
                setForm({ ...form, personalMessage: e.target.value })
              }
              placeholder="A message for the recipient"
              className="h-24 rounded-lg border border-[#E1E3E5] bg-transparent px-2.5 py-1.5 text-sm focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="expires-never"
              type="checkbox"
              checked={form.expiresNever}
              onChange={(e) =>
                setForm({ ...form, expiresNever: e.target.checked })
              }
              className="rounded border-[#E1E3E5] text-primary"
            />
            <label htmlFor="expires-never" className="text-sm text-[#616161]">
              Never expires
            </label>
          </div>
          {!form.expiresNever && (
            <div className="flex flex-col gap-1.5">
              <Label>Expires at</Label>
              <Input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) =>
                  setForm({ ...form, expiresAt: e.target.value })
                }
                className="text-sm"
              />
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit">Create gift card</Button>
          </DialogFooter>
        </form>
      </DialogContent>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function GiftCardsPage() {
  const [cards, setCards] = React.useState<GiftCard[]>(MOCK_GIFT_CARDS);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [search, setSearch] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    return cards.filter((card) => {
      const matchStatus =
        statusFilter === "all" || card.status === statusFilter;
      const term = search.toLowerCase().trim();
      const matchSearch =
        !term ||
        card.code.toLowerCase().includes(term) ||
        card.customer.toLowerCase().includes(term) ||
        (card.recipient ?? "").toLowerCase().includes(term);
      return matchStatus && matchSearch;
    });
  }, [cards, statusFilter, search]);

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleCreate = (card: Omit<GiftCard, "id" | "code" | "createdAt">) => {
    const newCard: GiftCard = {
      ...card,
      id: `gc_${Date.now()}`,
      code: `GC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };
    setCards((prev) => [newCard, ...prev]);
    setSelectedIds(new Set());
  };

  const handleExport = () => {
    const headers = [
      "Code ending",
      "Status",
      "Customer",
      "Recipient",
      "Created",
      "Current balance",
      "Initial value",
    ];
    const rows = filtered.map((card) => {
      const current = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: card.currency,
      }).format(card.currentBalance / 100);
      const initial = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: card.currency,
      }).format(card.initialValue / 100);
      return [
        card.code.split("-").pop() ?? card.code,
        card.status,
        card.customer,
        card.recipient ?? "",
        new Date(card.createdAt).toLocaleString(),
        current,
        initial,
      ];
    });
    const csv = [headers, ...rows]
      .map((r) =>
        r.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gift-cards.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Exported gift cards");
  };

  const hasCards = cards.length > 0;
  const hasFiltered = filtered.length > 0;

  return (
    <PageHeader
      title="Gift cards"
      actions={
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!hasCards}
          >
            <Download className="mr-1 size-3.5" /> Export
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger>
              <Button size="sm">Create gift card</Button>
            </DialogTrigger>
            <CreateGiftCardDialogContent
              onCreate={handleCreate}
              onClose={() => setDialogOpen(false)}
            />
          </Dialog>
        </div>
      }
    >
      {hasCards && <GiftCardsBanner />}
      <GiftCardsToolbar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        search={search}
        onSearchChange={setSearch}
      />
      <div className="mt-3">
        {hasFiltered ? (
          <GiftCardsTable
            cards={filtered}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
          />
        ) : (
          <GiftCardsEmptyState />
        )}
      </div>
    </PageHeader>
  );
}
