"use client";

import { csvProducts, productsCsv } from "@/lib/product-csv";
import { useState } from "react";
import { Button } from "@zerocraft/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@zerocraft/components/ui/dialog";

export function ProductTransfer({ products, canImport, onComplete }: { products: { id: string; deleted_at: string | null; [key: string]: unknown }[]; canImport: boolean; onComplete: () => Promise<unknown> }) {
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("csv");
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(0);
  function exportProducts() {
    const records = products.filter(p => !p.deleted_at);
    const blob = new Blob([exportFormat === "csv" ? productsCsv(records) : JSON.stringify({ format: "zerocraft-products-v1", products: records }, null, 2)], { type: exportFormat === "csv" ? "text/csv;charset=utf-8" : "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `zerocraft-products.${exportFormat}`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setExportOpen(false);
  }
  async function importProducts() {
    setBusy(true); setError(""); let done = completed;
    try {
      for (let i = completed; i < records.length; i++) {
        const record = records[i];
        const { id, deleted_at, purge_after, deleted_from_status, product_media, digital_files, collection_products, write_version, created_at, updated_at, ...data } = record;
        const response = await fetch("/api/store", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity: "product", data: { ...data, status: "draft", variants: Array.isArray(data.variants) ? data.variants.map((variant: Record<string, unknown>) => { const { id, inventory_levels, ...fields } = variant; return fields; }) : [] } }) });
        if (!response.ok) { const result = await response.json(); throw new Error(`Row ${i + 1}: ${result.error || "Import failed"}`); }
        done++; setCompleted(done);
      }
      setRecords([]); setOpen(false);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Import failed"); }
    finally { try { if (done > completed) await onComplete(); } finally { setBusy(false); } }
  }
  return <>
    {canImport && <Button variant="outline" onClick={() => { setOpen(true); setRecords([]); setCompleted(0); setError(""); }}>Import</Button>}
    <Button variant="outline" disabled={!products.length} onClick={() => setExportOpen(true)}>Export</Button>
    <Dialog open={exportOpen} onOpenChange={setExportOpen}><DialogContent><DialogHeader><DialogTitle>Export products</DialogTitle><DialogDescription>Export {products.filter(p => !p.deleted_at).length} products. CSV includes catalog fields and variant data. JSON preserves the full product snapshot.</DialogDescription></DialogHeader><label><input type="radio" name="export-format" checked={exportFormat === "csv"} onChange={() => setExportFormat("csv")} /> CSV for Excel, Numbers, or other spreadsheet programs</label><label><input type="radio" name="export-format" checked={exportFormat === "json"} onChange={() => setExportFormat("json")} /> Zerocraft JSON</label><DialogFooter><Button variant="outline" onClick={() => setExportOpen(false)}>Cancel</Button><Button onClick={exportProducts}>Export products</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent><DialogHeader><DialogTitle>Import products</DialogTitle><DialogDescription>Upload a Zerocraft CSV or JSON export. CSV requires Title, Handle, Variant SKU, and Variant Price columns. New products are imported as drafts; existing SKUs and handles are never overwritten. Media files and collection memberships must be attached in the editor.</DialogDescription></DialogHeader>
        <label className="grid gap-2 text-sm">Catalog file<input type="file" accept=".csv,.json,text/csv,application/json" disabled={busy} onChange={async event => {
          setError(""); setRecords([]); setCompleted(0);
          try {
            const file = event.target.files?.[0]; if (!file) return;
            if (file.size > 5_000_000) throw new Error("Choose a file smaller than 5 MB.");
            const content = await file.text();
            const value = file.name.toLowerCase().endsWith(".csv") ? { format: "zerocraft-products-v1", products: csvProducts(content) } : JSON.parse(content);
            if (value.format !== "zerocraft-products-v1" || !Array.isArray(value.products) || !value.products.length || value.products.length > 500) throw new Error("Choose a Zerocraft export containing 1–500 products.");
            for (const [index, row] of value.products.entries()) if (!row || typeof row.title !== "string" || !row.title.trim() || typeof row.slug !== "string" || typeof row.sku !== "string" || !Number.isFinite(row.price) || row.price < 0) throw new Error(`Row ${index + 1} is missing a valid title, handle, SKU, or price.`);
            setRecords(value.products);
          } catch (failure) { setError(failure instanceof Error ? failure.message : "Invalid file"); }
        }} /></label>
        {records.length > 0 && <p className="text-sm">{records.length} products ready · {completed} imported</p>}
        {error && <p role="alert" className="text-sm text-red-600">{error}{completed > 0 ? ` ${completed} products were already saved.` : ""}</p>}
        <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button disabled={busy || !records.length || completed === records.length} onClick={() => void importProducts()}>{busy ? "Importing…" : completed ? "Retry remaining" : "Import as drafts"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
