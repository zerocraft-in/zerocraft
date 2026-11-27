"use client";

import * as React from "react";
import { toast } from "@zerocraft/ui/toast";

import {
  bulkArchiveProducts,
  bulkDeleteProducts,
  bulkSetProductStatus,
} from "../actions";
import { Button } from "@zerocraft/ui/button";
import { Checkbox } from "@zerocraft/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@zerocraft/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

interface BulkToolbarProps {
  selectedProducts: string[];
  allSelected: boolean;
  someSelected: boolean;
  canUpdate: boolean;
  canArchive: boolean;
  onSelectAll: (checked: boolean) => void;
  onClearSelection: () => void;
  onBulkEdit: () => void;
  onRefresh: () => void;
}

export function BulkToolbar({
  selectedProducts,
  allSelected,
  someSelected,
  canUpdate,
  canArchive,
  onSelectAll,
  onClearSelection,
  onBulkEdit,
  onRefresh,
}: BulkToolbarProps) {
  const countLabel = `${selectedProducts.length} selected`;

  const handleBulkArchive = async () => {
    if (selectedProducts.length === 0) return;
    if (!window.confirm(`Archive ${selectedProducts.length} product(s)?`))
      return;

    try {
      const result = await bulkArchiveProducts({ ids: selectedProducts });
      if (result.ok) {
        toast.add({
          title: `${selectedProducts.length} product(s) archived.`,
          type: "success",
        });
        onRefresh();
      } else {
        toast.add({ title: result.error, type: "error" });
      }
    } finally {
      onClearSelection();
    }
  };

  const handleBulkPublish = async () => {
    if (selectedProducts.length === 0) return;

    try {
      const result = await bulkSetProductStatus({
        ids: selectedProducts,
        status: "active",
      });
      if (result.ok) {
        toast.add({
          title: `${selectedProducts.length} product(s) published.`,
          type: "success",
        });
        onRefresh();
      } else {
        toast.add({ title: result.error, type: "error" });
      }
    } finally {
      onClearSelection();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    if (!window.confirm(`Delete ${selectedProducts.length} product(s) permanently? This cannot be undone.`)) return;

    try {
      const result = await bulkDeleteProducts({ ids: selectedProducts });
      if (result.ok) {
        toast.add({ title: `${selectedProducts.length} product(s) deleted.`, type: "success" });
        onRefresh();
      } else {
        toast.add({ title: result.error, type: "error" });
      }
    } finally {
      onClearSelection();
    }
  };

  const handleBulkStatusChange = async (status: "draft" | "active") => {
    if (selectedProducts.length === 0) return;

    try {
      const result = await bulkSetProductStatus({
        ids: selectedProducts,
        status,
      });
      if (result.ok) {
        toast.add({
          title: `${selectedProducts.length} product(s) set to ${status}.`,
          type: "success",
        });
        onRefresh();
      } else {
        toast.add({ title: result.error, type: "error" });
      }
    } finally {
      onClearSelection();
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected}
          onCheckedChange={(checked) => onSelectAll(!!checked)}
          aria-label="Select all products"
        />
        <select
          className="border border-input bg-background px-2 py-1 rounded text-sm outline-none"
          onChange={(e) => {
            const value = e.target.value as string;
            if (value === "deselect-all") {
              onSelectAll(false);
            } else if (value === "select-all-page") {
              onSelectAll(true);
            }
          }}
        >
          <option value="">{countLabel}</option>
          <option value="select-all-page">Select all on page</option>
          <option value="deselect-all">Deselect all</option>
        </select>

        <Button variant="outline" size="sm" className=" text-sm" onClick={onBulkEdit}>
          Bulk edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-sm"
          onClick={() => handleBulkStatusChange("draft")}
          disabled={selectedProducts.length === 0}
        >
          Set as draft
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="text-sm"
                aria-label="More bulk actions"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {canUpdate && (
              <DropdownMenuItem onClick={handleBulkPublish}>
                Publish selected
              </DropdownMenuItem>
            )}
            {canArchive && (
              <DropdownMenuItem
                onClick={handleBulkArchive}
                className="text-destructive focus:text-destructive"
              >
                Archive selected
              </DropdownMenuItem>
            )}
            {canArchive && (
              <DropdownMenuItem
                onClick={handleBulkDelete}
                className="text-destructive focus:text-destructive"
              >
                Delete selected permanently
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={onClearSelection}
              className="text-destructive focus:text-destructive"
            >
              Clear selection
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
