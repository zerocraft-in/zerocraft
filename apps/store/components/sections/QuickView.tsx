"use client";
import { useState } from "react";
import Art from "./Art";
import ProductPanel from "./ProductPanel";
import type { Product } from "@/data/products";
import { useStore } from "@/lib/store";

export default function QuickView() {
  const { quick, closeAll, catalog: products } = useStore();
  const p = quick !== null ? products[quick] : null;
  const [last, setLast] = useState<Product | null>(null);
  const [previousQuick, setPreviousQuick] = useState<number | null>(null);
  if (quick !== previousQuick) {
    setPreviousQuick(quick);
    if (p) setLast(p);
  }
  const show = p ?? last;
  return (
    <div className={"quick-view-modal" + (p ? " is-active" : "")} role="dialog" aria-modal="true" aria-hidden={!p}>
      {show && <>
        <div className="quick-view__preview"><Art p={show} k="q" /></div>
        <div className="quick-view__content">
          <button className="quick-view__close" onClick={closeAll} aria-label="Close">×</button>
          <ProductPanel key={show.id} p={show} onDone={closeAll} showLink />
        </div>
      </>}
    </div>
  );
}
