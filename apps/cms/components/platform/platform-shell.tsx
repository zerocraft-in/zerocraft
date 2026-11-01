import Link from 'next/link';
export function PlatformShell({ children, name }: { children: React.ReactNode; name?: string }) {
  return <div className="min-h-svh bg-[#f1f1f1] text-[#303030]">
    <header className="flex h-14 items-center justify-between bg-[#1a1a1a] px-5 text-white">
      <Link href="/stores" className="font-semibold tracking-tight">ZeroCraft <span className="ml-2 text-xs font-normal text-neutral-400">{name || 'Your stores'}</span></Link>
      <Link href="/stores" className="rounded-lg border border-white/20 px-3 py-1.5 text-xs">Switch store</Link>
    </header>
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">{children}</main>
  </div>;
}
