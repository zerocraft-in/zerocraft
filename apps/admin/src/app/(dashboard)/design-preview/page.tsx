"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { Button } from "@zerocraft/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@zerocraft/ui/card";
import { Tag, Package, AlertCircle } from "lucide-react";

type StockItem = {
  id: string;
  style: string;
  size: string;
  qty: number;
  cost: number;
  tag: "low" | "ok";
};

const received: StockItem[] = [
  { id: "1", style: "Spring tee — oatmeal", size: "S–XL", qty: 48, cost: 599, tag: "ok" },
  { id: "2", style: "Denim jacket — indigo", size: "S–XL", qty: 12, cost: 2499, tag: "low" },
  { id: "3", style: "Linen shirt — sage", size: "S–XL", qty: 24, cost: 1299, tag: "ok" },
];

function TagPill({ item }: { item: StockItem }) {
  const isLow = item.tag === "low";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-medium leading-none uppercase tracking-[0.1em]"
      style={{
        background: isLow ? "var(--tag)" : "var(--muted)",
        color: isLow ? "var(--tag-foreground)" : "var(--muted-foreground)",
      }}
    >
      {isLow ? "LOW STOCK" : "ON FLOOR"}
    </span>
  );
}

function StockRow({ item }: { item: StockItem }) {
  const isLow = item.tag === "low";
  return (
    <Card
      className="flex flex-col gap-2 p-3 border-l-2"
      style={{
        borderLeftColor: isLow ? "var(--tag)" : "var(--dye)",
      }}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-0">
        <div className="flex flex-col gap-0.5">
          <CardTitle className="text-[13px] font-medium leading-tight" style={{ color: "var(--ink)" }}>
            {item.style}
          </CardTitle>
          <CardDescription className="text-[11px] leading-tight" style={{ color: "var(--muted-foreground)" }}>
            Size {item.size} · {item.qty} units
          </CardDescription>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[13px] font-semibold leading-tight" style={{ color: "var(--ink)" }}>
            ₹{item.cost.toLocaleString()}
          </span>
          <TagPill item={item} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-3">
          <span className="flex size-5 items-center justify-center rounded-sm border border-border text-[10px]" style={{ color: "var(--muted-foreground)" }}>
            {item.id}
          </span>
          <span className="text-[11px] leading-tight" style={{ color: "var(--muted-foreground)" }}>
            Awaiting tagging on the cutting table
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DesignPreviewPage() {
  return (
    <main
      className="flex min-h-full flex-col font-manrope"
      style={{ background: "var(--background)" }}
    >
      {/* Single orchestrated motion moment: one page-load fade-in. */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col px-6 py-6"
      >
        <header className="pb-8">
          {/* The garment tag is the memorable element — type + shape as the design. */}
          <div
            className="relative inline-flex items-end gap-2"
            style={{ display: "inline-block" }}
          >
            <div
              className="relative rounded-[6px] bg-ink px-4 py-2 flex items-center gap-2"
              style={{
                width: 170,
                color: "var(--paper)",
                background: "var(--ink)",
              }}
            >
              <span className="text-[11px] font-medium leading-none tracking-wider opacity-70">
                maara merch · stock receipt
              </span>
              <div className="ml-auto flex items-baseline gap-0.5">
                <span className="text-[26px] font-extrabold leading-tight">12</span>
                <span className="text-[12px] font-medium">units received</span>
              </div>
            </div>
            {/* Tag pin / knot — the active part of the design, not decoration. */}
            <div
              className="absolute -top-2 -left-1/2 w-4 h-4 rotate-45 rounded-sm bg-tag flex items-center justify-center"
              style={{ transform: "translatex(50%) rotate(45deg)", zIndex: 10 }}
            >
              <Tag className="size-3" style={{ color: "var(--paper)" }} />
            </div>
          </div>
          <h2
            className="mt-4 text-[22px] font-extrabold leading-tight tracking-tight"
            style={{ color: "var(--ink)" }}
          >
            Tag new garments before they hit the floor
          </h2>
          <p className="mt-2 max-w-[60ch] text-[13px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            Receive the spring delivery, apply size stickers, and flag anything
            below par before close.
          </p>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {received.map((item) => (
            <StockRow key={item.id} item={item} />
          ))}
        </section>

        <section className="mt-12 flex flex-wrap gap-3">
          <Button
            onClick={() => { }}
            className="bg-ink text-paper"
          >
            <Package className="mr-2 size-4" /> Receive stock
          </Button>
          <Button variant="outline">
            Print tags
          </Button>
        </section>

        {/* Restraint: one quiet empty-state note, no decoration. */}
        <section className="mt-12 rounded-xl border border-border bg-card p-6" style={{ color: "var(--ink)" }}>
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
            <div className="flex flex-col gap-1">
              <p className="text-[13px] font-medium leading-snug">Everything is tagged.</p>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                No items await tagging. The shop floor is ready to open.
              </p>
            </div>
          </div>
        </section>
      </motion.div>
    </main>
  );
}
