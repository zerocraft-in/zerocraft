"use client";

import { toast } from "@/lib/toast";
import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconPlus,
  IconUsers,
  IconSearch,
  IconCircleCheck,
  IconX,
  IconSparkles,
  IconChevronDown,
  IconColumns,
  IconDotsVertical,
  IconChevronsLeft,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsRight,
  IconLoader2,
  IconMail,
  IconPhone,
  IconEye,
  IconSend,
} from "@tabler/icons-react";
import {
  fetchClientsFromSupabase,
  createClientInSupabase,
  updateClientInSupabase,
  deleteClientInSupabase,
} from "@/lib/supabase-client";
import { useCurrency } from "@/lib/currency-context";

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/studio-controls";
import { Field } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: "active" | "lead" | "archived" | string;
  total_spent: number;
  created_at: string;
}

export default function StudioClientsCRUD() {
  const router = useRouter();
  const { formatAmount } = useCurrency();
  const [clients, setClients] = useState<Client[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "lead">("all");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState("10");

  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    company: true,
    contact: true,
    status: true,
    spent: true,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchClientsFromSupabase(true)
      .then((data) => {
        if (!active) return;
        setClients(data ? (data as any) : []);
        setLoading(false);
      })
      .catch(() => {
        toast.error(
          "Records could not be loaded. Check your connection and reload.",
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    status: "active",
    total_spent: 0,
  });

  const openCreateModal = () => {
    setEditingClient(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      status: "lead",
      total_spent: 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cli: Client) => {
    setEditingClient(cli);
    setFormData({
      name: cli.name,
      email: cli.email,
      phone: cli.phone,
      company: cli.company,
      status: cli.status,
      total_spent: cli.total_spent,
    });
    setIsModalOpen(true);
  };

  const [saving, setSaving] = useState(false);
  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const payload = formData;
    try {
      if (editingClient) {
        const updated = await updateClientInSupabase(editingClient.id, payload);
        setClients((previous) =>
          previous.map((item) =>
            item.id === editingClient.id ? { ...item, ...updated } : item,
          ),
        );
      } else {
        const created = await createClientInSupabase(payload);
        setClients((previous) => [created as Client, ...previous]);
      }
      toast.success("Client saved");
      setIsModalOpen(false);
    } catch {
      toast.error(
        "Could not save. Your changes are still here. Check your connection and permissions, then try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to remove this client account?")) {
      try {
        await deleteClientInSupabase(id);
      } catch {
        toast.error(
          "Could not save this change. Check your connection and permissions.",
        );
        return;
      }
      setClients((prev) => prev.filter((c) => c.id !== id));
      setSelectedRows((prev) => prev.filter((rId) => rId !== id));
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedRows];
    if (
      !ids.length ||
      !confirm(`Remove ${ids.length} selected client account(s)? This cannot be undone.`)
    ) {
      return;
    }

    setBulkActionLoading(true);
    const results = await Promise.allSettled(ids.map(deleteClientInSupabase));
    const deletedIds = ids.filter(
      (_, index) => results[index].status === "fulfilled",
    );
    const failedCount = ids.length - deletedIds.length;

    setClients((previous) =>
      previous.filter((client) => !deletedIds.includes(client.id)),
    );
    setSelectedRows((previous) =>
      previous.filter((id) => !deletedIds.includes(id)),
    );
    if (failedCount) {
      toast.error(
        `${deletedIds.length} client(s) removed; ${failedCount} could not be removed.`,
      );
    } else {
      toast.success(`${deletedIds.length} client(s) removed`);
    }
    setBulkActionLoading(false);
  };

  const handleBulkStatusUpdate = async (status: Client["status"]) => {
    const ids = [...selectedRows];
    if (!ids.length) return;

    setBulkActionLoading(true);
    const results = await Promise.allSettled(
      ids.map((id) => updateClientInSupabase(id, { status })),
    );
    const succeededIds = ids.filter(
      (_, index) => results[index].status === "fulfilled",
    );
    const failedCount = ids.length - succeededIds.length;

    setClients((previous) =>
      previous.map((client) =>
        succeededIds.includes(client.id) ? { ...client, status } : client,
      ),
    );
    setSelectedRows((previous) =>
      previous.filter((id) => !succeededIds.includes(id)),
    );
    if (failedCount) {
      toast.error(
        `${succeededIds.length} client(s) updated; ${failedCount} could not be updated.`,
      );
    } else {
      toast.success(`${succeededIds.length} client(s) set to ${status}`);
    }
    setBulkActionLoading(false);
  };

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === "all" || c.status === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [clients, searchQuery, activeTab]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredClients.length / Number(rowsPerPage)),
  );
  const page = Math.min(currentPage, pageCount);
  const pageRows = filteredClients.slice(
    (page - 1) * Number(rowsPerPage),
    page * Number(rowsPerPage),
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows((previous) =>
        Array.from(new Set([...previous, ...pageRows.map((item) => item.id)])),
      );
    } else {
      setSelectedRows((previous) =>
        previous.filter((id) => !pageRows.some((item) => item.id === id)),
      );
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRows((prev) =>
        prev.includes(id) ? prev : [...prev, id],
      );
    } else {
      setSelectedRows((prev) => prev.filter((item) => item !== id));
    }
  };

  const isAllSelected =
    pageRows.length > 0 &&
    pageRows.every((item) => selectedRows.includes(item.id));

  const tabCounts = useMemo(() => {
    const act = clients.filter((c) => c.status === "active").length;
    const ld = clients.filter((c) => c.status === "lead").length;
    return { all: clients.length, active: act, lead: ld };
  }, [clients]);

  return (
    <div className="space-y-6 pt-2 font-sans text-foreground antialiased">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <IconUsers className="size-5 text-muted-foreground" /> Clients
          </h1>
          <p className="text-xs text-muted-foreground font-normal mt-0.5">
            Manage agency accounts, sales leads, and client contact profiles.
          </p>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={openCreateModal}
          className="rounded-xl self-start sm:self-auto"
        >
          <IconPlus className="w-4 h-4" />
          <span>Add Client</span>
        </Button>
      </div>

      {/* Reference-Styled Table Container */}
      <div className="space-y-4">
        {/* Top Tabs & Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value as typeof activeTab);
              setCurrentPage(1);
            }}
          >
            <TabsList className="h-9 rounded-xl p-1">
              <TabsTrigger value="all" className="rounded-lg">
                All clients{" "}
                <span className="ml-1 text-xs text-muted-foreground">
                  {tabCounts.all}
                </span>
              </TabsTrigger>
              <TabsTrigger value="active">
                Active{" "}
                <span className="ml-1 text-xs text-muted-foreground">
                  {tabCounts.active}
                </span>
              </TabsTrigger>
              <TabsTrigger value="lead">
                Leads{" "}
                <span className="ml-1 text-xs text-muted-foreground">
                  {tabCounts.lead}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2.5">
            <Field className="max-w-sm">
              <InputGroup className="h-9 rounded-xl">
                <InputGroupInput
                  id="clients-search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => (
                    setSearchQuery(e.target.value),
                    setCurrentPage(1)
                  )}
                />
                <InputGroupAddon align="inline-start">
                  <IconSearch className="text-muted-foreground" />
                </InputGroupAddon>
              </InputGroup>
            </Field>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" className="rounded-xl">
                  <IconColumns className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Customize columns</span>
                  <IconChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-accent" />
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.name}
                  onCheckedChange={(v) =>
                    setVisibleColumns((p) => ({ ...p, name: !!v }))
                  }
                >
                  Contact Name
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.company}
                  onCheckedChange={(v) =>
                    setVisibleColumns((p) => ({ ...p, company: !!v }))
                  }
                >
                  Company
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.contact}
                  onCheckedChange={(v) =>
                    setVisibleColumns((p) => ({ ...p, contact: !!v }))
                  }
                >
                  Contact details
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.status}
                  onCheckedChange={(v) =>
                    setVisibleColumns((p) => ({ ...p, status: !!v }))
                  }
                >
                  Status
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.spent}
                  onCheckedChange={(v) =>
                    setVisibleColumns((p) => ({ ...p, spent: !!v }))
                  }
                >
                  Total spent
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {selectedRows.length > 0 && (
          <div
            role="toolbar"
            aria-label="Bulk actions"
            className="fixed bottom-4 left-1/2 z-50 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-nowrap items-center gap-1 overflow-x-auto rounded-xl border border-border bg-background/95 p-2 shadow-xl backdrop-blur"
          >
            <span className="flex shrink-0 items-center gap-2 px-2 text-xs font-medium text-foreground">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                {selectedRows.length}
              </span>
              selected
            </span>
            <span aria-hidden="true" className="mx-1 h-6 shrink-0 border-l border-border" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={bulkActionLoading}
                  className="h-8 shrink-0 rounded-lg"
                >
                  Status
                  <IconChevronDown className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Set status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(["active", "lead", "archived"] as const).map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => void handleBulkStatusUpdate(status)}
                  >
                    {status[0].toUpperCase() + status.slice(1)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              disabled={bulkActionLoading}
              onClick={() => void handleBulkDelete()}
              className="h-8 shrink-0 rounded-lg text-destructive hover:text-destructive"
            >
              Remove
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={bulkActionLoading}
              onClick={() => setSelectedRows([])}
              aria-label="Clear selection"
              className="size-8 shrink-0 rounded-lg px-0"
            >
              <IconX className="size-4" />
            </Button>
          </div>
        )}

        {/* Table View */}
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-10 p-3">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    className="border-border data-[state=checked]:bg-white data-[state=checked]:text-background"
                  />
                </TableHead>

                {visibleColumns.name && (
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Contact Name
                  </TableHead>
                )}
                {visibleColumns.company && (
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Company
                  </TableHead>
                )}
                {visibleColumns.contact && (
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Contact
                  </TableHead>
                )}
                {visibleColumns.status && (
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Status
                  </TableHead>
                )}
                {visibleColumns.spent && (
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Total spent
                  </TableHead>
                )}
                <TableHead className="w-12 text-right text-muted-foreground"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {filteredClients.length === 0 ? (
                <TableRow className="hover:bg-transparent border-none">
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-xs text-muted-foreground"
                  >
                    No client accounts matching search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((cli) => {
                  const isSelected = selectedRows.includes(cli.id);
                  return (
                    <TableRow
                      key={cli.id}
                      className={`border-border transition-colors hover:bg-muted/60 ${
                        isSelected ? "bg-muted/70" : ""
                      }`}
                    >
                      <TableCell className="w-10 p-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(c) => handleSelectRow(cli.id, !!c)}
                          className="border-border data-[state=checked]:bg-white data-[state=checked]:text-background"
                        />
                      </TableCell>

                      {visibleColumns.name && (
                        <TableCell className="p-3 text-sm font-medium text-foreground">
                          <Link
                            href={`/clients/${cli.id}`}
                            className="group flex items-center gap-1.5 transition-colors hover:text-emerald-600"
                          >
                            <span>{cli.name}</span>
                            <IconEye className="w-3.5 h-3.5 text-emerald-600 opacity-0 transition-opacity group-hover:opacity-100" />
                          </Link>
                        </TableCell>
                      )}

                      {visibleColumns.company && (
                        <TableCell className="p-3">
                          <span className="inline-flex rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-foreground">
                            {cli.company}
                          </span>
                        </TableCell>
                      )}

                      {visibleColumns.contact && (
                        <TableCell className="p-3 space-y-1">
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(cli.email)}&su=${encodeURIComponent("Zerocraft Project Update")}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Send Email via Gmail"
                              className="flex max-w-[180px] items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                            >
                              <IconMail className="size-3 shrink-0 text-muted-foreground" />
                              <span className="truncate max-w-[130px]">
                                {cli.email}
                              </span>
                            </a>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://wa.me/${cli.phone ? cli.phone.replace(/[^0-9]/g, "") : ""}?text=${encodeURIComponent(`Hello ${cli.name}, regarding your Zerocraft project...`)}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Chat on WhatsApp"
                              className="flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 font-mono text-xs text-foreground transition-colors hover:bg-accent"
                            >
                              <IconSend className="size-3 shrink-0 text-emerald-600" />
                              <span>{cli.phone || "N/A"}</span>
                            </a>
                            {cli.phone && (
                              <a
                                href={`tel:${cli.phone}`}
                                title="Call Client"
                                className="rounded-md border border-border bg-muted p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                              >
                                <IconPhone className="size-3" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                      )}

                      {visibleColumns.status && (
                        <TableCell className="p-3">
                          {cli.status === "active" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-foreground">
                              <IconCircleCheck className="size-3.5 text-emerald-600" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                              <IconLoader2 className="size-3 text-muted-foreground" />
                              <span>
                                {cli.status === "lead"
                                  ? "Lead"
                                  : cli.status === "archived"
                                    ? "Archived"
                                    : cli.status}
                              </span>
                            </span>
                          )}
                        </TableCell>
                      )}

                      {visibleColumns.spent && (
                        <TableCell className="p-3 text-xs font-medium text-foreground">
                          {formatAmount(cli.total_spent)}
                        </TableCell>
                      )}

                      <TableCell className="w-12 text-right p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg text-muted-foreground transition-colors hover:text-accent-foreground"
                            >
                              <IconDotsVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              onClick={() => router.push(`/clients/${cli.id}`)}
                              className="flex cursor-pointer items-center gap-2 font-medium"
                            >
                              <IconEye className="size-3.5 text-muted-foreground" />
                              View Profile & Timeline
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-accent" />
                            <DropdownMenuItem
                              onClick={() => openEditModal(cli)}
                              className="cursor-pointer"
                            >
                              Edit Profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-accent" />
                            <DropdownMenuItem
                              onClick={() => handleDelete(cli.id)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              Remove Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-muted-foreground pt-2">
          <div>
            <span>
              {selectedRows.length} of {filteredClients.length} row(s) selected.
            </span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Rows per page</span>
              <Select
                value={rowsPerPage}
                onValueChange={(val) =>
                  val && (setRowsPerPage(val), setCurrentPage(1))
                }
              >
                <SelectTrigger className="h-8 w-16 bg-muted border-border text-xs rounded-xl text-foreground">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent
                  align="start"
                  className="bg-muted border-border text-foreground text-xs rounded-xl"
                >
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <span className="font-semibold text-foreground">
              Page {page} of {pageCount}
            </span>

            <div className="flex items-center gap-1">
              <Button
                aria-label="First page"
                disabled={page === 1}
                onClick={() => setCurrentPage(1)}
                variant="outline"
                size="icon"
                className="size-8 rounded-lg text-muted-foreground"
              >
                <IconChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                aria-label="Previous page"
                disabled={page === 1}
                onClick={() => setCurrentPage(page - 1)}
                variant="outline"
                size="icon"
                className="size-8 rounded-lg text-muted-foreground"
              >
                <IconChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                aria-label="Next page"
                disabled={page === pageCount}
                onClick={() => setCurrentPage(page + 1)}
                variant="outline"
                size="icon"
                className="size-8 rounded-lg text-muted-foreground"
              >
                <IconChevronRight className="w-4 h-4" />
              </Button>
              <Button
                aria-label="Last page"
                disabled={page === pageCount}
                onClick={() => setCurrentPage(pageCount)}
                variant="outline"
                size="icon"
                className="size-8 rounded-lg text-muted-foreground"
              >
                <IconChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!saving) setIsModalOpen(open);
        }}
      >
        <DialogContent className="bg-background border border-border text-foreground max-w-lg rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <IconSparkles className="w-4 h-4 text-primary" />
              {editingClient ? "Edit Client Account" : "Add Client Account"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveClient} className="space-y-4 text-xs pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label
                  className="text-foreground font-semibold"
                  htmlFor="clients-name"
                >
                  Contact Name
                </label>
                <Input
                  id="clients-name"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Alex Morgan"
                  className="bg-muted border-border text-foreground focus-visible:ring-ring h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label
                  className="text-foreground font-semibold"
                  htmlFor="clients-company"
                >
                  Company Name
                </label>
                <Input
                  id="clients-company"
                  required
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                  className="bg-muted border-border text-foreground focus-visible:ring-ring h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label
                  className="text-foreground font-semibold"
                  htmlFor="clients-email"
                >
                  Email Address
                </label>
                <Input
                  id="clients-email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="bg-muted border-border text-foreground focus-visible:ring-ring h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label
                  className="text-foreground font-semibold"
                  htmlFor="clients-phone"
                >
                  IconPhone Number
                </label>
                <Input
                  id="clients-phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="bg-muted border-border text-foreground focus-visible:ring-ring h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-foreground font-semibold">
                  Account Status
                </label>
                <Select
                  value={formData.status}
                  onValueChange={(val) =>
                    val && setFormData({ ...formData, status: val })
                  }
                >
                  <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-xl text-xs focus:ring-ring">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border text-foreground text-xs rounded-xl">
                    <SelectItem value="active">Active Client</SelectItem>
                    <SelectItem value="lead">New Lead</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label
                  className="text-foreground font-semibold"
                  htmlFor="clients-total_spent"
                >
                  Total Spent ($)
                </label>
                <Input
                  id="clients-total_spent"
                  type="number"
                  value={formData.total_spent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      total_spent: Number(e.target.value),
                    })
                  }
                  className="bg-muted border-border text-foreground focus-visible:ring-ring h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-accent-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-extrabold text-xs rounded-xl"
              >
                {editingClient ? "Update Account" : "Save Account"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
