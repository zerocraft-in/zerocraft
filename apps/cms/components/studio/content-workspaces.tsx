"use client";

import {
  IconArrowUpRight,
  IconChevronDown,
  IconFile,
  IconFileText,
  IconFolder,
  IconInfoCircle,
  IconLayoutGrid,
  IconPlus,
  IconSearch,
  IconUpload,
} from "@tabler/icons-react";
import { Button, Input } from "@/components/ui/studio-controls";
import { FilesMediaManager } from "@/components/studio/files-media-manager";

function EmptyWorkspace({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof IconFile;
  title: string;
  description: string;
  action: string;
}) {
  return (
    <div className="flex min-h-[270px] flex-col items-center justify-center rounded-xl border border-border bg-background px-6 py-12 text-center shadow-sm">
      <div className="mb-5 grid size-20 place-items-center rounded-3xl bg-muted text-primary">
        <Icon className="size-10" stroke={1.5} />
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-xs leading-5 text-muted-foreground">{description}</p>
      <Button className="mt-5 h-9 rounded-lg px-4" onClick={() => undefined}>
        <IconPlus className="size-4" /> {action}
      </Button>
    </div>
  );
}

export function MetaobjectsPage() {
  return (
    <section className="space-y-5 text-sm">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-medium text-muted-foreground">Content</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Metaobjects</h1></div>
        <div className="flex gap-2"><Button variant="outline" className="h-9 rounded-lg">Manage</Button><Button className="h-9 rounded-lg"><IconPlus className="size-4" /> Add definition</Button></div>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[["Available on storefront", "0 entries"], ["Web pages", "0 entries"], ["Active", "1 entry"], ["Draft", "0 entries"]].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-background p-4 shadow-sm"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-3 text-lg font-semibold">{value}</p></div>)}
        <div className="rounded-xl border border-border bg-background p-4 shadow-sm sm:col-span-2 lg:col-span-4"><div className="flex items-center justify-between"><p className="text-xs font-medium text-muted-foreground">Recent entries</p><span className="text-xs text-primary">Delivery countries</span></div><div className="mt-4 flex items-center justify-between text-xs"><span>Delivery countries</span><span className="text-muted-foreground">Knowledge Base Facts</span></div></div>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3 shadow-sm sm:flex-row sm:items-center"><Button variant="ghost" className="h-8 justify-start rounded-lg px-2 text-xs">Custom <IconChevronDown className="ml-1 size-3.5" /></Button><div className="relative flex-1"><IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Searching in metaobject definitions..." className="h-8 rounded-lg pl-9" /></div><IconLayoutGrid className="hidden size-4 text-muted-foreground sm:block" /></div>
      <EmptyWorkspace icon={IconFileText} title="No definitions found" description="Try changing the filters or a search term" action="Learn more about metaobjects" />
    </section>
  );
}

export function FilesPage() {
  return <FilesMediaManager />;
}

export function MenusPage() {
  const menus = [{ name: "Main menu", items: "Home, Catalog, Contact" }, { name: "Footer menu", items: "Search" }, { name: "Customer account main menu", items: "Orders, Profile" }];
  return <section className="space-y-5 text-sm"><header className="flex items-center justify-between"><div><p className="text-xs font-medium text-muted-foreground">Content</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Menus</h1></div><div className="flex gap-2"><Button variant="outline" className="h-9 rounded-lg">URL redirects</Button><Button className="h-9 rounded-lg"><IconPlus className="size-4" /> Create menu</Button></div></header><div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm"><div className="flex items-center justify-between border-b border-border px-4 py-3 text-xs text-muted-foreground"><span>Menu <IconChevronDown className="ml-1 inline size-3.5" /></span><span>Menu items</span></div>{menus.map((menu) => <div key={menu.name} className="grid grid-cols-2 border-b border-border px-4 py-3 last:border-0"><span className="font-medium">{menu.name}</span><span className="text-muted-foreground">{menu.items}</span></div>)}</div></section>;
}

export function BlogPostsPage() {
  return <section className="space-y-5 text-sm"><header className="flex items-center justify-between"><div><p className="text-xs font-medium text-muted-foreground">Content</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Blog posts</h1></div><Button variant="outline" className="h-9 rounded-lg"><IconArrowUpRight className="size-4" /> Manage blogs</Button></header><EmptyWorkspace icon={IconFileText} title="Write a blog post" description="Blog posts are a great way to build a community around your products and your brand." action="Create blog post" /><div className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><IconInfoCircle className="size-4" /> Learn more about blog posts</div></section>;
}
