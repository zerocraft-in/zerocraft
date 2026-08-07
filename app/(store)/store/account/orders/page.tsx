"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Breadcrumbs from "@/components/store/Breadcrumbs";
import { useStore } from "@/lib/store/useStore";
import { IconPackage, IconArrowRight, IconCheck, IconTruck, IconClock } from "@tabler/icons-react";

export default function MyOrdersPage() {
  const { orders } = useStore();
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredOrders = filterStatus === "all"
    ? orders
    : orders.filter((o) => o.status.toLowerCase() === filterStatus.toLowerCase());

  return (
    <div className="py-8 min-h-screen">
      <div className="container-site">
        <Breadcrumbs
          items={[
            { label: "My Account", href: "/account" },
            { label: "Orders" },
          ]}
        />

        <div className="my-8 pb-6 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <span className="text-label text-amber-600 dark:text-amber-400 mb-2 block">
              Order History
            </span>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white">
              My Orders ({orders.length})
            </h1>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-2 font-mono text-xs overflow-x-auto no-scrollbar">
            {["all", "delivered", "processing", "shipped", "cancelled"].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl capitalize transition-all ${
                  filterStatus === st
                    ? "bg-black text-white dark:bg-white dark:text-black font-bold"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-6 my-8">
          {filteredOrders.length === 0 ? (
            <div className="p-16 text-center rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <IconPackage size={48} className="mx-auto mb-4 text-neutral-300 dark:text-neutral-700" />
              <p className="text-base font-semibold mb-2">No orders found in &ldquo;{filterStatus}&rdquo; status.</p>
              <Link href="/shop" className="text-xs font-mono text-amber-600 dark:text-amber-400 underline">
                Browse Store Catalog →
              </Link>
            </div>
          ) : (
            filteredOrders.map((ord) => (
              <div
                key={ord.id}
                className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs space-y-6"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800 font-mono text-xs">
                  <div>
                    <span className="text-neutral-400">Order ID: </span>
                    <strong className="text-neutral-900 dark:text-white font-bold text-sm">{ord.orderNumber}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400">Placed on: </span>
                    <span className="text-neutral-800 dark:text-neutral-200">{ord.date}</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    ord.status === "Delivered"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : ord.status === "Shipped"
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  }`}>
                    {ord.status}
                  </span>
                </div>

                {/* Purchased Items list */}
                <div className="space-y-3">
                  {ord.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between font-mono text-xs">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0">
                          <Image src={item.image} alt={item.title} fill sizes="48px" className="object-cover" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-neutral-900 dark:text-white text-sm line-clamp-1">{item.title}</h4>
                          <span className="text-[11px] text-neutral-400">
                            Qty: {item.quantity} {item.color && `• ${item.color}`} {item.size && `• ${item.size}`}
                          </span>
                        </div>
                      </div>
                      <span className="font-bold text-neutral-900 dark:text-white">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Footer Total & Link */}
                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <div className="text-xs font-mono text-neutral-500">
                    Total Amount: <strong className="text-base text-neutral-900 dark:text-white">${ord.total.toFixed(2)}</strong>
                  </div>

                  <Link
                    href={`/account/orders/${ord.orderNumber}`}
                    className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold text-xs font-mono uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-1.5"
                  >
                    Order Details <IconArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
