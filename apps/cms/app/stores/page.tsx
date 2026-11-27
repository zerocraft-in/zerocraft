import Link from 'next/link';
import { ownerPage } from '@/lib/platform/page-access';
import { PlatformShell } from '@/components/platform/platform-shell';
import { Card, CardContent } from '@zerocraft/components/ui/card';
import { redirectToStoreEntry } from '@/lib/platform/entry-route';
export default async function Stores() {
  const { client } = await ownerPage();
  await redirectToStoreEntry(client);
  const { data: stores, error } = await client.from('stores').select('id,name,slug,status,setup_completed_at').order('created_at');
  if (error) throw new Error('Stores could not be loaded.');
  return <PlatformShell><div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Your stores</h1></div><Link className="rounded-lg bg-[#303030] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-black" href="/stores/new">Create store</Link></div>
    <Card className="overflow-hidden shadow-sm"><CardContent className="divide-y p-0">{stores?.length ? stores.map(store=><Link key={store.id} href={`/store/${store.slug}${store.setup_completed_at?'':'/setup'}`} className="group flex items-center justify-between p-5 transition hover:bg-white"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-lg bg-[#303030] text-sm font-semibold text-white">{store.name.slice(0,1).toUpperCase()}</span><div><p className="font-medium">{store.name}</p><p className="mt-1 text-xs text-muted-foreground">{store.slug}</p></div></div><span className={`rounded-full px-3 py-1 text-xs font-medium ${store.setup_completed_at?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{store.setup_completed_at?'Ready':'Continue setup'} <span className="ml-1 transition group-hover:translate-x-0.5">→</span></span></Link>) : <div className="p-12 text-center"><h2 className="font-semibold">Your next store starts here</h2><p className="mt-2 text-sm text-muted-foreground">Create a store, connect its database, and build your catalog.</p></div>}</CardContent></Card>
  </PlatformShell>;
}

