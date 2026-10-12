"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { IconBell, IconBriefcase, IconCalendar, IconChartBar, IconDatabase, IconFileText, IconHome, IconLogout, IconMenu2, IconSearch, IconShoppingBag, IconSparkles, IconStar, IconUsers, IconX, IconBolt } from "@tabler/icons-react";
import { supabase, type StudioNotification, fetchNotificationsFromSupabase, markAllNotificationsAsReadInSupabase, markNotificationAsReadInSupabase } from "@/lib/supabase-client";

const groups = [
  { label: "Overview", links: [{ label: "Dashboard", href: "/studio", icon: IconHome }, { label: "Analytics", href: "/studio/reports", icon: IconChartBar }, { label: "Database", href: "/studio/database", icon: IconDatabase }] },
  { label: "Operations", links: [{ label: "Store orders", href: "/studio/orders", icon: IconShoppingBag }, { label: "Appointments", href: "/studio/appointments", icon: IconCalendar }, { label: "Clients", href: "/studio/clients", icon: IconUsers }, { label: "Staff", href: "/studio/staff", icon: IconUsers }] },
  { label: "Content", links: [{ label: "Works", href: "/studio/works", icon: IconBriefcase }, { label: "Blogs", href: "/studio/blogs", icon: IconFileText }, { label: "Reviews", href: "/studio/reviews", icon: IconStar }] },
  { label: "Intelligence", links: [{ label: "Automations", href: "/studio/automations", icon: IconBolt }, { label: "AI studio", href: "/studio/ai", icon: IconSparkles }] },
] ;
const links = groups.flatMap((group) => group.links);

function StudioMark({ className = "size-7" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={`${className} fill-[#c8fb00]`}><path d="M5.16.43c4.97,7.25,9.93,8.51,14.9,3.78,1.09,1.24,1.94,2.48,2.53,3.71-2.41,3.97-7.69,4.08-11.59,6.41,4.15-.64,8.18-.19,12.08,1.37-.44,1.21-1.13,2.42-2.07,3.63-5.6-5.34-11.2-3.92-16.8,4.26-1.48-1.89-2.57-3.78-3.3-5.67,2.87-6.36,8.78-7.1,12.63-8.59-3.92-.16-7.97-1.26-12.14-3.32.88-1.86,2.13-3.72,3.76-5.58Z" /></svg>;
}

export default function StudioShell({ children, user }: { children: React.ReactNode; user: { name: string; email: string; role: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [notices, setNotices] = useState<StudioNotification[]>([]);
  const active = links.find((item) => item.href === pathname || (item.href !== "/studio" && pathname.startsWith(item.href + "/")));
  const results = useMemo(() => links.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())), [query]);
  const unread = notices.filter((item) => !item.read).length;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen((value) => !value); }
      if (event.key === "Escape") { setSearchOpen(false); setMenuOpen(false); setNoticesOpen(false); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  useEffect(() => {
    let current = true;
    const load = async () => { const data = await fetchNotificationsFromSupabase(); if (current) setNotices(data); };
    void load();
    const channel = supabase.channel("studio-notices").on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => { void load(); }).subscribe();
    return () => { current = false; void supabase.removeChannel(channel); };
  }, []);

  async function signOut() { await supabase.auth.signOut(); router.replace("/login"); router.refresh(); }
  async function readNotice(item: StudioNotification) { await markNotificationAsReadInSupabase(item.id); setNotices((current) => current.map((notice) => notice.id === item.id ? { ...notice, read: true } : notice)); setNoticesOpen(false); if (item.link?.startsWith("/studio")) router.push(item.link); }

  return <div className="studio-app min-h-screen bg-[#f5f5f2] text-[#171915] dark:bg-[#0c0e0d] dark:text-[#f3f4f0]">
    <div className="flex min-h-screen">
      {menuOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMenuOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-black/10 bg-[#111411] text-[#f3f4f0] transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6"><Link href="/studio" onClick={() => setMenuOpen(false)} className="flex items-center gap-3"><StudioMark /><span className="text-sm font-extrabold leading-[.95] tracking-[-.04em]">ZEROCRAFT<br />STUDIO</span></Link><button className="lg:hidden" aria-label="Close menu" onClick={() => setMenuOpen(false)}><IconX size={20} /></button></div>
        <div className="px-6 pt-6"><span className="font-mono text-[10px] uppercase tracking-[.18em] text-[#c8fb00]">Studio workspace</span><p className="mt-1 text-xs text-white/45">Design · Code · Story</p></div>
        <nav aria-label="Studio navigation" className="mt-6 flex-1 space-y-5 overflow-y-auto px-3 pb-5">{groups.map((group) => <div key={group.label}><p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[.16em] text-white/35">{group.label}</p>{group.links.map((item) => { const Icon = item.icon; const selected = item.href === pathname || (item.href !== "/studio" && pathname.startsWith(item.href + "/")); return <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} aria-current={selected ? "page" : undefined} className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${selected ? "bg-[#c8fb00] text-[#111411]" : "text-white/62 hover:bg-white/8 hover:text-white"}`}><Icon size={18} stroke={1.8} />{item.label}</Link>; })}</div>)}</nav>
        <div className="border-t border-white/10 px-4 py-4"><div className="mb-3 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-3"><span className="flex size-9 items-center justify-center rounded-full bg-[#c8fb00] text-sm font-bold text-[#111411]">{user.name[0]?.toUpperCase()}</span><span className="min-w-0"><strong className="block truncate text-xs font-semibold">{user.name}</strong><small className="font-mono text-[10px] uppercase tracking-wider text-white/45">{user.role}</small></span></div><button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-white/55 hover:bg-white/8 hover:text-white"><IconLogout size={16} /> Sign out</button></div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-17 items-center justify-between gap-3 border-b border-black/10 bg-[#f5f5f2]/92 px-4 backdrop-blur-xl sm:px-8 dark:border-white/10 dark:bg-[#0c0e0d]/92"><div className="flex min-w-0 items-center gap-3"><button aria-label="Open navigation" className="rounded-lg border border-black/10 p-2 lg:hidden dark:border-white/15" onClick={() => setMenuOpen(true)}><IconMenu2 size={18} /></button><span className="font-mono text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">Studio /</span><strong className="truncate text-sm font-semibold">{active?.label || "Workspace"}</strong></div><div className="flex items-center gap-2"><button onClick={() => setSearchOpen(true)} aria-label="Search studio pages" className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-xs text-black/55 hover:border-black/30 sm:min-w-45 dark:border-white/15 dark:text-white/55 dark:hover:border-white/30"><IconSearch size={16} /><span className="hidden sm:inline">Search pages</span><kbd className="ml-auto hidden font-mono text-[10px] sm:inline">⌘K</kbd></button><button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="rounded-lg border border-black/10 px-3 py-2 font-mono text-[10px] uppercase dark:border-white/15" aria-label="Toggle color theme">{theme === "dark" ? "Light" : "Dark"}</button><button onClick={() => setNoticesOpen((value) => !value)} aria-label={`Notifications, ${unread} unread`} className="relative rounded-lg border border-black/10 p-2 dark:border-white/15"><IconBell size={18} />{unread > 0 && <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#c8fb00] text-[10px] text-black">{unread > 9 ? "9+" : unread}</span>}</button></div></header>
        {noticesOpen && <div className="absolute right-4 top-17 z-40 w-[min(390px,calc(100vw-2rem))] rounded-xl border border-black/10 bg-white p-4 shadow-xl dark:border-white/15 dark:bg-[#171b17]"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Notifications</h2><button onClick={async () => { await markAllNotificationsAsReadInSupabase(); setNotices((items) => items.map((item) => ({ ...item, read: true }))); }} disabled={!unread} className="text-xs underline disabled:opacity-40">Mark all read</button></div><div className="mt-3 max-h-80 divide-y divide-black/10 overflow-y-auto dark:divide-white/10">{notices.length ? notices.map((item) => <button key={item.id} onClick={() => readNotice(item)} className="block w-full py-3 text-left"><strong className="block text-xs">{!item.read && <span className="mr-2 inline-block size-1.5 rounded-full bg-[#a2cf00]" />}{item.title}</strong><span className="mt-1 block text-xs text-black/50 dark:text-white/50">{item.message}</span></button>) : <p className="py-6 text-center text-xs text-black/50 dark:text-white/50">No notifications yet.</p>}</div></div>}
        <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-8 sm:py-9">{children}</div>
      </div>
    </div>
    {searchOpen && <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/70 px-4 pt-[15vh]" onMouseDown={(event) => { if (event.target === event.currentTarget) setSearchOpen(false); }}><div role="dialog" aria-modal="true" aria-label="Search studio pages" className="w-full max-w-lg rounded-xl border border-white/15 bg-[#171b17] p-3 text-white shadow-2xl"><div className="flex items-center gap-2 border-b border-white/10 px-2 pb-3"><IconSearch size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Go to a studio page…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /><button aria-label="Close search" onClick={() => setSearchOpen(false)}><IconX size={18} /></button></div><div className="max-h-80 overflow-y-auto pt-2">{results.map((item) => { const Icon = item.icon; return <button key={item.href} onClick={() => { router.push(item.href); setSearchOpen(false); setQuery(""); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-white/10"><Icon size={17} />{item.label}</button>; })}{!results.length && <p className="p-3 text-xs text-white/50">No matching pages.</p>}</div></div></div>}
  </div>;
}
