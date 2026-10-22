"use client";

import { toast } from "@/lib/toast";
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
import React, { useState, useEffect, useMemo } from "react";
import {
  IconCalendar,
  IconPlus,
  IconSearch,
  IconSend,
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
  IconClock,
} from "@tabler/icons-react";
import { Field } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

import { sendWhatsAppViaN8n } from "@/lib/n8n";
import {
  fetchAppointmentsFromSupabase,
  createAppointmentInSupabase,
  updateAppointmentInSupabase,
  deleteAppointmentInSupabase,
} from "@/lib/supabase-client";

interface Appointment {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  service: string;
  scheduled_at: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | string;
  notes?: string;
  whatsapp_sent: boolean;
  created_at: string;
}

export default function StudioAppointmentsCRUD() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "confirmed" | "pending">(
    "all",
  );
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);

  const [visibleColumns, setVisibleColumns] = useState({
    client: true,
    service: true,
    scheduled: true,
    status: true,
    whatsapp: true,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [n8nStatusMessage, setN8nStatusMessage] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) setIsMounted(true);
    });
    fetchAppointmentsFromSupabase(true)
      .then((data) => {
        if (active && data) setAppointments(data as any);
      })
      .catch(() => {
        toast.error(
          "Records could not be loaded. Check your connection and reload.",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  const [formData, setFormData] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    service: "1:1 Product Strategy Session",
    scheduled_at: "",
    status: "confirmed",
    notes: "",
  });

  const openCreateModal = () => {
    setEditingAppt(null);
    setFormData({
      client_name: "",
      client_email: "",
      client_phone: "",
      service: "1:1 Product Strategy Session",
      scheduled_at: "",
      status: "confirmed",
      notes: "",
    });
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("create") !== "1")
      return;
    const timer = window.setTimeout(() => {
      openCreateModal();
      window.history.replaceState({}, "", window.location.pathname);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const openEditModal = (appt: Appointment) => {
    setEditingAppt(appt);
    setFormData({
      client_name: appt.client_name,
      client_email: appt.client_email,
      client_phone: appt.client_phone,
      service: appt.service,
      scheduled_at: new Date(
        new Date(appt.scheduled_at).getTime() -
          new Date(appt.scheduled_at).getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16),
      status: appt.status,
      notes: appt.notes || "",
    });
    setIsModalOpen(true);
  };

  const [saving, setSaving] = useState(false);
  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        ...formData,
        scheduled_at: new Date(formData.scheduled_at).toISOString(),
      };
      if (editingAppt) {
        const updated = await updateAppointmentInSupabase(
          editingAppt.id,
          payload,
        );
        setAppointments((previous) =>
          previous.map((item) =>
            item.id === editingAppt.id ? { ...item, ...updated } : item,
          ),
        );
      } else {
        const created = await createAppointmentInSupabase(payload);
        setAppointments((previous) => [created as Appointment, ...previous]);
      }
      setIsModalOpen(false);
      toast.success("Appointment saved");
    } catch {
      toast.error(
        "Could not save the appointment. Your changes are still here.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this appointment slot?")) {
      try {
        await deleteAppointmentInSupabase(id);
      } catch {
        toast.error("Could not delete the appointment.");
        return;
      }
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      setSelectedRows((prev) => prev.filter((rId) => rId !== id));
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedRows];
    if (
      !ids.length ||
      !confirm(`Delete ${ids.length} selected appointment(s)? This cannot be undone.`)
    ) {
      return;
    }

    setBulkActionLoading(true);
    const results = await Promise.allSettled(
      ids.map(deleteAppointmentInSupabase),
    );
    const deletedIds = ids.filter(
      (_, index) => results[index].status === "fulfilled",
    );
    const failedCount = ids.length - deletedIds.length;

    setAppointments((previous) =>
      previous.filter((appointment) => !deletedIds.includes(appointment.id)),
    );
    setSelectedRows((previous) =>
      previous.filter((id) => !deletedIds.includes(id)),
    );
    if (failedCount) {
      toast.error(
        `${deletedIds.length} appointment(s) deleted; ${failedCount} could not be deleted.`,
      );
    } else {
      toast.success(`${deletedIds.length} appointment(s) deleted`);
    }
    setBulkActionLoading(false);
  };

  const handleBulkStatusUpdate = async (status: Appointment["status"]) => {
    const ids = [...selectedRows];
    if (!ids.length) return;

    setBulkActionLoading(true);
    const results = await Promise.allSettled(
      ids.map((id) => updateAppointmentInSupabase(id, { status })),
    );
    const succeededIds = ids.filter(
      (_, index) => results[index].status === "fulfilled",
    );
    const failedCount = ids.length - succeededIds.length;

    setAppointments((previous) =>
      previous.map((appointment) =>
        succeededIds.includes(appointment.id)
          ? { ...appointment, status }
          : appointment,
      ),
    );
    setSelectedRows((previous) =>
      previous.filter((id) => !succeededIds.includes(id)),
    );
    if (failedCount) {
      toast.error(
        `${succeededIds.length} appointment(s) updated; ${failedCount} could not be updated.`,
      );
    } else {
      toast.success(`${succeededIds.length} appointment(s) set to ${status}`);
    }
    setBulkActionLoading(false);
  };

  const handleTriggerN8n = async (appt: Appointment) => {
    setN8nStatusMessage(
      `Triggering n8n WhatsApp workflow for ${appt.client_name}...`,
    );

    const res = await sendWhatsAppViaN8n(appt.id);

    if (res.success) {
      setAppointments((prev) =>
        prev.map((a) => (a.id === appt.id ? { ...a, whatsapp_sent: true } : a)),
      );
    }

    setN8nStatusMessage(res.message);
    setTimeout(() => setN8nStatusMessage(null), 5000);
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const matchesSearch =
        a.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.client_email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === "all" || a.status === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [appointments, searchQuery, activeTab]);

  const pageSize = Number(rowsPerPage);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAppointments.length / pageSize),
  );
  const page = Math.min(currentPage, totalPages);
  const pageAppointments = filteredAppointments.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const visibleColumnCount =
    2 + Object.values(visibleColumns).filter(Boolean).length;

  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) setIsModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isModalOpen, saving]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows((current) => [
        ...new Set([...current, ...pageAppointments.map((a) => a.id)]),
      ]);
    } else {
      setSelectedRows((current) =>
        current.filter(
          (id) =>
            !pageAppointments.some((appointment) => appointment.id === id),
        ),
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
    pageAppointments.length > 0 &&
    pageAppointments.every((appointment) =>
      selectedRows.includes(appointment.id),
    );

  const tabCounts = useMemo(() => {
    const conf = appointments.filter((a) => a.status === "confirmed").length;
    const pend = appointments.filter((a) => a.status === "pending").length;
    return { all: appointments.length, confirmed: conf, pending: pend };
  }, [appointments]);

  const formatDate = (isoString: string) => {
    if (!isMounted) return isoString.replace("T", " ").slice(0, 16);
    try {
      return new Date(isoString).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 pt-2 font-sans text-foreground antialiased">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <IconCalendar className="size-5 text-muted-foreground" /> Appointments
          </h1>
          <p className="text-xs text-muted-foreground font-normal mt-0.5">
            Schedule studio sessions, product strategy calls, and n8n WhatsApp
            automations.
          </p>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={openCreateModal}
          className="self-start rounded-xl sm:self-auto"
        >
          <IconPlus className="w-4 h-4" />
          <span>Book Slot</span>
        </Button>
      </div>

      {/* n8n Status Alert */}
      {n8nStatusMessage && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3 text-xs text-foreground">
          <div className="flex items-center gap-2">
            <IconSend className="size-4 text-muted-foreground" />
            <span className="font-medium">
              {n8nStatusMessage}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setN8nStatusMessage(null)}
            className="h-8 text-muted-foreground hover:text-accent-foreground"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Reference-Styled Table Container */}
      <div className="space-y-4">
        {/* Tabs & Actions */}
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
                All bookings{" "}
                <span className="ml-1 text-xs text-muted-foreground">
                  {tabCounts.all}
                </span>
              </TabsTrigger>
              <TabsTrigger value="confirmed">
                Confirmed{" "}
                <span className="ml-1 text-xs text-muted-foreground">
                  {tabCounts.confirmed}
                </span>
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending{" "}
                <span className="ml-1 text-xs text-muted-foreground">
                  {tabCounts.pending}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2.5">
            <Field className="max-w-sm">
              <InputGroup className="h-9 rounded-xl">
                <InputGroupInput
                  id="appointments-search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setCurrentPage(1);
                  }}
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
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-accent" />
                {(
                  [
                    ["client", "Client & contact"],
                    ["service", "Service"],
                    ["scheduled", "Scheduled time"],
                    ["status", "Status"],
                    ["whatsapp", "WhatsApp trigger"],
                  ] as const
                ).map(([key, label]) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={visibleColumns[key]}
                    onCheckedChange={(checked) =>
                      setVisibleColumns((previous) => ({
                        ...previous,
                        [key]: checked === true,
                      }))
                    }
                  >
                    {label}
                  </DropdownMenuCheckboxItem>
                ))}
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
                {(
                  ["confirmed", "pending", "completed", "cancelled"] as const
                ).map((status) => (
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
              Delete
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
        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-10 p-3">
                  <Checkbox
                    aria-label="Select all bookings on this page"
                    checked={isAllSelected}
                    onCheckedChange={(checked) =>
                      handleSelectAll(checked === true)
                    }
                  />
                </TableHead>

                {visibleColumns.client && (
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Client & Contact
                  </TableHead>
                )}
                {visibleColumns.service && (
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Service
                  </TableHead>
                )}
                {visibleColumns.scheduled && (
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Scheduled Time
                  </TableHead>
                )}
                {visibleColumns.status && (
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Status
                  </TableHead>
                )}
                {visibleColumns.whatsapp && (
                  <TableHead className="text-right text-xs font-medium text-muted-foreground">
                    WhatsApp Trigger
                  </TableHead>
                )}
                <TableHead aria-label="Booking actions" className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {filteredAppointments.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={visibleColumnCount}
                    className="h-32 text-center text-xs text-muted-foreground"
                  >
                    No appointment bookings matching search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                pageAppointments.map((appt) => {
                  const isSelected = selectedRows.includes(appt.id);
                  return (
                    <TableRow
                      key={appt.id}
                      className={`border-border transition-colors hover:bg-muted/60 ${
                        isSelected ? "bg-muted/70" : ""
                      }`}
                    >
                      <TableCell className="w-10 p-3">
                        <Checkbox
                          aria-label={`Select ${appt.client_name}`}
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleSelectRow(appt.id, checked === true)
                          }
                        />
                      </TableCell>

                      {visibleColumns.client && (
                        <TableCell className="p-3">
                          <div className="flex min-w-40 flex-col">
                            <strong className="text-sm font-medium text-foreground">
                              {appt.client_name}
                            </strong>
                            <span className="text-xs text-muted-foreground">
                              {appt.client_email}
                            </span>
                            <small className="text-xs text-muted-foreground">
                              {appt.client_phone}
                            </small>
                          </div>
                        </TableCell>
                      )}

                      {visibleColumns.service && (
                        <TableCell className="p-3">
                          <span className="inline-flex rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-foreground">
                            {appt.service}
                          </span>
                        </TableCell>
                      )}

                      {visibleColumns.scheduled && (
                        <TableCell
                          className="whitespace-nowrap p-3 text-xs text-muted-foreground"
                          suppressHydrationWarning
                        >
                          {formatDate(appt.scheduled_at)}
                        </TableCell>
                      )}

                      {visibleColumns.status && (
                        <TableCell className="p-3">
                          {appt.status === "confirmed" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-foreground">
                              <IconCircleCheck className="size-3.5 text-emerald-600" />
                              <span>Confirmed</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                              <IconClock className="size-3.5" />
                              <span>
                                {appt.status[0].toUpperCase() +
                                  appt.status.slice(1)}
                              </span>
                            </span>
                          )}
                        </TableCell>
                      )}

                      {visibleColumns.whatsapp && (
                        <TableCell className="p-3 text-right">
                          <Button
                            type="button"
                            onClick={() => handleTriggerN8n(appt)}
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 rounded-lg"
                          >
                            <IconSend className="size-3.5" />
                            <span>
                              {appt.whatsapp_sent
                                ? "Sent via n8n"
                                : "Trigger n8n"}
                            </span>
                          </Button>
                        </TableCell>
                      )}

                      <TableCell className="w-12 p-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Actions for ${appt.client_name}`}
                              className="size-8 rounded-lg text-muted-foreground"
                            >
                              <IconDotsVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => openEditModal(appt)}
                              className="cursor-pointer"
                            >
                              Edit booking
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => void handleTriggerN8n(appt)}
                              className="cursor-pointer"
                            >
                              Trigger WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-accent" />
                            <DropdownMenuItem
                              onClick={() => void handleDelete(appt.id)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              Cancel booking
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
              {selectedRows.length} of {filteredAppointments.length} row(s)
              selected.
            </span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Rows per page</span>
              <Select
                value={rowsPerPage}
                onValueChange={(value) => {
                  if (!value) return;
                  setRowsPerPage(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger
                  aria-label="Rows per page"
                  className="h-8 w-16 rounded-xl text-xs"
                >
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <span className="font-semibold text-foreground">
              Page {currentPage} of {totalPages}
            </span>

            <div className="flex items-center gap-1">
              <Button
                aria-label="First page"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(1)}
                variant="outline"
                size="icon"
                className="size-8 rounded-lg text-muted-foreground"
              >
                <IconChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                aria-label="Previous page"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                variant="outline"
                size="icon"
                className="size-8 rounded-lg text-muted-foreground"
              >
                <IconChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                aria-label="Next page"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                variant="outline"
                size="icon"
                className="size-8 rounded-lg text-muted-foreground"
              >
                <IconChevronRight className="w-4 h-4" />
              </Button>
              <Button
                aria-label="Last page"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
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
        <DialogContent
          showCloseButton={false}
          className="max-w-lg rounded-3xl border border-border bg-background p-6 text-foreground shadow-2xl"
        >
          <DialogHeader className="flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <IconSparkles className="size-4 text-muted-foreground" />
              {editingAppt ? "Edit appointment" : "Book an appointment"}
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={saving}
              aria-label="Close appointment form"
              onClick={() => setIsModalOpen(false)}
              className="size-8"
            >
              <IconX className="size-4" />
            </Button>
          </DialogHeader>

          <form
            onSubmit={handleSaveAppointment}
            className="space-y-4 text-xs pt-2"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-foreground" htmlFor="appointment-client-name">
                  Client Name
                </label>
                <Input
                  id="appointment-client-name"
                  required
                  value={formData.client_name}
                  onChange={(e) =>
                    setFormData({ ...formData, client_name: e.target.value })
                  }
                  placeholder="e.g. Jonathan Reed"
                  className="h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground" htmlFor="appointment-client-phone">
                  Client Phone
                </label>
                <Input
                  id="appointment-client-phone"
                  required
                  value={formData.client_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, client_phone: e.target.value })
                  }
                  placeholder="+1 (555) 000-0000"
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground" htmlFor="appointment-client-email">
                Client Email
              </label>
              <Input
                id="appointment-client-email"
                type="email"
                required
                value={formData.client_email}
                onChange={(e) =>
                  setFormData({ ...formData, client_email: e.target.value })
                }
                placeholder="client@company.com"
                className="h-10 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-foreground" htmlFor="appointment-service">
                  Service Type
                </label>
                <Select
                  value={formData.service}
                  onValueChange={(value) =>
                    value && setFormData({ ...formData, service: value })
                  }
                >
                  <SelectTrigger id="appointment-service" className="h-10 rounded-xl text-xs">
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1 Product Strategy Session">
                    1:1 Product Strategy Session
                    </SelectItem>
                    <SelectItem value="Design System Consultation">
                    Design System Consultation
                    </SelectItem>
                    <SelectItem value="Full Web App Audit">Full Web App Audit</SelectItem>
                    <SelectItem value="Custom Engineering Sprint">
                    Custom Engineering Sprint
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground" htmlFor="appointment-scheduled-at">
                  Scheduled Date & Time
                </label>
                <Input
                  id="appointment-scheduled-at"
                  type="datetime-local"
                  required
                  value={formData.scheduled_at}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduled_at: e.target.value })
                  }
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground" htmlFor="appointment-status">
                Status
              </label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  value && setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger id="appointment-status" className="h-10 rounded-xl text-xs">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground" htmlFor="appointment-notes">
                Meeting Notes
              </label>
              <textarea
                id="appointment-notes"
                rows={2}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Special instructions..."
                className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-border pt-4">
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
                className="rounded-xl"
              >
                {editingAppt ? "Update Booking" : "Save Booking"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
