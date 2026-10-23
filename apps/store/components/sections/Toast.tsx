"use client";
import { useStore } from "@/lib/store";
export default function Toast() { const { toast } = useStore(); return <div className={"storefront-toast" + (toast.on ? " is-active" : "")} role="status" aria-live="polite">{toast.m}</div>; }
