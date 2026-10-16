"use client";

import { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Breadcrumbs from "@/components/store/Breadcrumbs";
import { useStore } from "@/lib/store/useStore";
import { formatCatalogPrice } from "@/lib/commerce/format";
import { IconPrinter, IconCheck, IconTruck, IconClock, IconArrowLeft } from "@tabler/icons-react";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { orders } = useStore();

  const order = orders.find((o) => o.orderNumber === id || o.id === id);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  if (!order) return <div className="container-site min-h-screen py-24"><h1 className="text-3xl font-semibold">Request not found in this browser.</h1><p className="mt-4 text-neutral-500">For help with an earlier order, contact the studio with your request number.</p><Link href="/store/contact" className="mt-6 inline-block underline">Contact the studio</Link></div>;

  return (
    <div className="py-8 min-h-screen">
      <div className="container-site">
        <Breadcrumbs
          items={[
            { label: "My Account", href: "/store/account" },
            { label: "Orders", href: "/store/account/orders" },
            { label: order.orderNumber },
          ]}
        />

        {/* Top Header */}
        <div className="my-8 pb-6 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <Link href="/store/account/orders" className="text-xs font-mono text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 mb-2">
              <IconArrowLeft size={14} /> Back to My Orders
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Order {order.orderNumber}
            </h1>
            <p className="text-xs text-neutral-500 font-mono mt-1">Requested on {order.date} · No online payment collected</p>
          </div>

          <button
            onClick={() => setShowInvoiceModal(true)}
            className="px-5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-mono font-semibold uppercase tracking-wider hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
          >
            <IconPrinter size={16} /> View & Print Request
          </button>
        </div>

        {/* Order Step Timeline */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs my-8 space-y-6">
          <h2 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-bold">
            Request timeline saved in this browser · Contact the studio for current status
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative">
            {order.timeline.map((step, idx) => (
              <div key={idx} className="flex flex-col items-start gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                  step.completed
                    ? "bg-emerald-500 text-white"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
                }`}>
                  {step.completed ? <IconCheck size={16} /> : idx + 1}
                </div>
                <div className="font-mono text-xs">
                  <h4 className="font-bold text-neutral-900 dark:text-white">{step.step}</h4>
                  <p className="text-[11px] text-neutral-400">{step.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Itemized Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-8">
          <div className="lg:col-span-8 p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs space-y-6">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white font-mono uppercase tracking-wider pb-4 border-b border-neutral-200 dark:border-neutral-800">
              Requested Items ({order.items.length})
            </h2>

            <div className="space-y-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between font-mono text-xs pb-4 border-b border-neutral-100 dark:border-neutral-800/60 last:border-0">
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0">
                      <Image src={item.image} alt={item.title} fill sizes="64px" className="object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-neutral-900 dark:text-white text-sm">{item.title}</h4>
                      <span className="text-[11px] text-neutral-400">
                        Qty: {item.quantity} {item.color && `• ${item.color}`} {item.size && `• ${item.size}`}
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-neutral-900 dark:text-white text-sm">{formatCatalogPrice(item.price * item.quantity, item.currency)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Billing & Shipping Card */}
          <div className="lg:col-span-4 p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs space-y-6">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white font-mono uppercase tracking-wider pb-4 border-b border-neutral-200 dark:border-neutral-800">
              Shipping Address
            </h2>

            <div className="font-mono text-xs text-neutral-600 dark:text-neutral-300 space-y-1">
              <div className="font-bold text-neutral-900 dark:text-white text-sm">{order.shippingAddress.fullName}</div>
              <div>{order.shippingAddress.street}</div>
              <div>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</div>
              <div>{order.shippingAddress.country}</div>
              <div className="pt-2 text-lime-600 dark:text-lime-400">Phone: {order.shippingAddress.phone}</div>
            </div>

            <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-2 font-mono text-xs text-neutral-600 dark:text-neutral-300">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCatalogPrice(order.subtotal, order.currency)}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{formatCatalogPrice(order.discount, order.currency)}</span></div>}
              <div className="flex justify-between"><span>Shipping</span><span>{formatCatalogPrice(order.shippingFee, order.currency)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{formatCatalogPrice(order.tax, order.currency)}</span></div>
              <div className="flex justify-between pt-3 border-t border-neutral-200 dark:border-neutral-800 font-bold text-base text-neutral-900 dark:text-white">
                <span>Estimated total · due on delivery</span>
                <span className="text-lime-600 dark:text-lime-400">{formatCatalogPrice(order.total, order.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Printable Invoice Modal Overlay */}
        {showInvoiceModal && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-white text-black p-8 rounded-3xl max-w-2xl w-full font-mono text-xs space-y-6 shadow-2xl relative">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-black font-bold"
              >
                ✕ Close
              </button>

              <div className="flex justify-between border-b pb-4">
                <div>
                  <h2 className="text-xl font-bold uppercase tracking-wider">ZeroCraft Store</h2>
                  <p className="text-[10px] text-neutral-500">Order request summary · Not a tax invoice</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm">REQUEST #{order.orderNumber}</span>
                  <p className="text-[10px] text-neutral-500">{order.date}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-bold uppercase text-[10px] text-neutral-400">Billed To</h4>
                  <p className="font-bold">{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.street}</p>
                  <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                </div>
                <div className="text-right">
                  <h4 className="font-bold uppercase text-[10px] text-neutral-400">Payment Status</h4>
                  <p className="font-bold text-emerald-600">PAID</p>
                  <p>Method: {order.paymentMethod}</p>
                </div>
              </div>

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b font-bold uppercase text-[10px]">
                    <th className="py-2">Item Description</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2">{item.title} ({item.color || "Default"})</td>
                      <td className="py-2 text-center">{item.quantity}</td>
                      <td className="py-2 text-right">{formatCatalogPrice(item.price * item.quantity, item.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end pt-2 text-right">
                <div className="space-y-1 w-48">
                  <div className="flex justify-between"><span>Subtotal:</span><span>{formatCatalogPrice(order.subtotal, order.currency)}</span></div>
                  <div className="flex justify-between font-bold text-sm pt-2 border-t"><span>Estimated total · unpaid:</span><span>{formatCatalogPrice(order.total, order.currency)}</span></div>
                </div>
              </div>

              <div className="pt-6 border-t flex justify-between items-center text-[10px] text-neutral-400">
                <span>Thank you for choosing ZeroCraft Store!</span>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg bg-black text-white font-bold uppercase"
                >
                  Print Request Summary
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
