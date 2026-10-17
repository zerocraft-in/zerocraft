"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Breadcrumbs from "@/components/store/Breadcrumbs";
import { useStore } from "@/lib/store/useStore";
import { formatCatalogPrice } from "@/lib/commerce/format";
import { toast } from "sonner";
import {
  IconUser,
  IconPackage,
  IconHeart,
  IconMapPin,
  IconSettings,
  IconCheck,
  IconArrowRight,
} from "@/components/store/StoreIcon";

export default function AccountPage() {
  const { userProfile, updateProfile, orders, wishlist } = useStore();
  const [activeTab, setActiveTab] = useState<"profile" | "addresses" | "orders" | "wishlist">("profile");

  const [formData, setFormData] = useState({
    name: userProfile.name,
    email: userProfile.email,
    phone: userProfile.phone,
    street: userProfile.address.street,
    city: userProfile.address.city,
    state: userProfile.address.state,
    postalCode: userProfile.address.postalCode,
    country: userProfile.address.country,
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: {
        street: formData.street,
        city: formData.city,
        state: formData.state,
        postalCode: formData.postalCode,
        country: formData.country,
      },
    });
    toast.success("Profile details updated successfully!");
  };

  return (
    <div className="py-8 min-h-screen">
      <div className="container-site">
        <Breadcrumbs items={[{ label: "My Account" }]} />

        {/* User Greeting Card */}
        <div className="my-8 p-6 sm:p-8 rounded-3xl bg-neutral-900 text-white flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-lime-400 shrink-0">
              <Image src={userProfile.avatar} alt={userProfile.name} fill sizes="64px" className="object-cover" />
            </div>
            <div>
              <span className="text-label text-lime-400 block mb-1">Collector Account</span>
              <h1 className="text-2xl font-bold">{userProfile.name}</h1>
              <p className="text-xs text-neutral-400 font-mono">{userProfile.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-neutral-300">
            <div className="text-center px-4 py-2 rounded-xl bg-white/10 border border-white/10">
              <span className="block font-bold text-white text-base">{orders.length}</span>
              <span className="text-[10px] uppercase">Orders</span>
            </div>
            <div className="text-center px-4 py-2 rounded-xl bg-white/10 border border-white/10">
              <span className="block font-bold text-white text-base">{wishlist.length}</span>
              <span className="text-[10px] uppercase">Wishlist</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs & Main Panel Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 items-start">
          {/* Sidebar Navigation (3 cols) */}
          <nav className="lg:col-span-3 space-y-2 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 text-xs font-mono">
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors font-semibold ${
                activeTab === "profile"
                  ? "bg-lime-500/10 text-lime-600 dark:text-lime-400"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              <IconUser size={18} /> Profile Details
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors font-semibold ${
                activeTab === "orders"
                  ? "bg-lime-500/10 text-lime-600 dark:text-lime-400"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              <span className="flex items-center gap-3"><IconPackage size={18} /> Order History</span>
              <span className="px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-[10px]">{orders.length}</span>
            </button>

            <button
              onClick={() => setActiveTab("addresses")}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors font-semibold ${
                activeTab === "addresses"
                  ? "bg-lime-500/10 text-lime-600 dark:text-lime-400"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              <IconMapPin size={18} /> Saved Addresses
            </button>

            <Link
              href="/store/wishlist"
              className="w-full flex items-center justify-between p-3 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors font-semibold"
            >
              <span className="flex items-center gap-3"><IconHeart size={18} /> Wishlist</span>
              <span className="px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-[10px]">{wishlist.length}</span>
            </Link>
          </nav>

          {/* Main Body (9 cols) */}
          <div className="lg:col-span-9">
            {activeTab === "profile" && (
              <form onSubmit={handleSaveProfile} className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs space-y-6">
                <h2 className="text-base font-bold text-neutral-900 dark:text-white font-mono uppercase tracking-wider pb-4 border-b border-neutral-200 dark:border-neutral-800">
                  Edit Personal Information
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="space-y-1">
                    <label className="text-neutral-400 uppercase">Full Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-lime-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-400 uppercase">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-lime-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-400 uppercase">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-lime-400"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-black text-white dark:bg-white dark:text-black font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {activeTab === "addresses" && (
              <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs space-y-6">
                <h2 className="text-base font-bold text-neutral-900 dark:text-white font-mono uppercase tracking-wider pb-4 border-b border-neutral-200 dark:border-neutral-800">
                  Default Shipping Address
                </h2>

                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 font-mono text-xs space-y-1.5">
                  <div className="font-bold text-sm text-neutral-900 dark:text-white">{userProfile.name}</div>
                  <div className="text-neutral-500">{userProfile.address.street}</div>
                  <div className="text-neutral-500">{userProfile.address.city}, {userProfile.address.state} {userProfile.address.postalCode}</div>
                  <div className="text-neutral-500">{userProfile.address.country}</div>
                  <div className="text-lime-600 dark:text-lime-400 font-semibold pt-2">Phone: {userProfile.phone}</div>
                </div>
              </div>
            )}

            {activeTab === "orders" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white font-mono uppercase tracking-wider">
                    Recent Orders ({orders.length})
                  </h2>
                  <Link href="/store/account/orders" className="text-xs font-mono text-lime-600 dark:text-lime-400 hover:underline">
                    View Order Details →
                  </Link>
                </div>

                {orders.map((ord) => (
                  <div key={ord.id} className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono border-b border-neutral-100 dark:border-neutral-800 pb-3">
                      <div>
                        <span className="text-neutral-400">Order: </span>
                        <strong className="text-neutral-900 dark:text-white">{ord.orderNumber}</strong>
                      </div>
                      <div className="text-neutral-400">{ord.date}</div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                        ord.status === "Delivered" ? "bg-emerald-500/10 text-emerald-600" : "bg-lime-500/10 text-lime-600"
                      }`}>
                        {ord.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between font-mono text-xs">
                      <span>{ord.items.length} items purchased</span>
                      <span className="font-bold text-base text-neutral-900 dark:text-white">{formatCatalogPrice(ord.total, ord.currency)}</span>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Link
                        href={`/store/account/orders/${ord.orderNumber}`}
                        className="text-xs font-mono text-lime-600 dark:text-lime-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        View Order & Invoice <IconArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
