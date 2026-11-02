"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { IconTag, IconSearch, IconLayoutColumns, IconChevronDown, IconSelector, IconDots, IconCalendar, IconEye, IconArchive, IconEyeOff, IconTrash, IconPlus, IconPackage, IconCheck, IconX, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@zerocraft/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@zerocraft/components/ui/dialog";
import { Button } from "@zerocraft/components/ui/button";
import { Input } from "@zerocraft/components/ui/input";
import { formatRecordedMoney } from "@/lib/currency";
import { useCurrency } from "@/lib/currency-context";
import { ProductTransfer } from "./product-transfer";
import styles from "./products-workspace.module.css";

type Product = {
  id: string; title: string; slug: string; sku: string; status: string; image_url: string; category_id: string | null; price: number; currency: string; stock: number | null; product_type: string;
  vendor: string; merchandise_type: string; tags: string[]; sales_channels: string[]; catalogs: string[]; is_listed: boolean; deleted_at: string | null;
  variants: { id: string; stock: number | null; is_active: boolean; inventory_levels?: { on_hand: number; reserved: number }[] }[];
  collection_products: { collection_id: string }[];
  [key: string]: unknown;
};
type Metric = { id: string; title: string; stock: number | null; units: number; revenue: number; grade: string; sellThrough: number | null; daysRemaining: number | null };
type Payload = { products: Product[]; categories: { id: string; name: string }[]; collections: { id: string; name: string }[]; canManage: boolean; analytics: { sellThrough: number | null; daysRemaining: number | null; cRevenue: number; products: Metric[] } | null; analyticsError: string | null };
type Action = { key: string; title: string; description?: string };
const channels = [{ id: "online_store", name: "Online Store" }, { id: "point_of_sale", name: "Point of Sale" }];
const initialColumns = ["status", "inventory", "category", "channels", "type", "vendor"];
const columnLabels: Record<string, string> = { status: "Status", inventory: "Inventory", category: "Category", channels: "Channels", type: "Product type", vendor: "Vendor", price: "Price", tags: "Tags", catalogs: "Catalogs" };
const bulkActions = [
  { key: "status:archived", title: "Archive products", icon: IconArchive },
  { key: "unlist", title: "Unlist products", icon: IconEyeOff },
  { key: "list", title: "List products", icon: IconEye },
  { key: "delete", title: "Delete products", icon: IconTrash },
  { key: "include_channels", title: "Include in sales channels" }, { key: "exclude_channels", title: "Exclude from sales channels" },
  { key: "include_catalogs", title: "Include in catalogs" }, { key: "exclude_catalogs", title: "Exclude from catalogs" },
  { key: "add_tags", title: "Add tags" }, { key: "remove_tags", title: "Remove tags" },
  { key: "add_collections", title: "Add to collection(s)" }, { key: "remove_collections", title: "Remove from collection(s)" },
];
function stockOf(product: Product) {
  if (product.product_type === "digital") return null;
  const variants = product.variants.filter(v => v.is_active);
  return variants.length ? variants.reduce((sum, v) => sum + (v.inventory_levels?.length ? v.inventory_levels.reduce((n, l) => n + Math.max(0, l.on_hand - l.reserved), 0) : v.stock ?? 0), 0) : product.stock;
}
function Thumbnail({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  return <span className={styles.thumbnail}>{src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} /> : <IconPackage size={17} />}</span>;
}
function Menu({ label, children, iconOnly = false }: { label: React.ReactNode; children: React.ReactNode; iconOnly?: boolean }) {
  return <DropdownMenu><DropdownMenuTrigger render={<button type="button" className={iconOnly ? styles.iconButton : styles.menuButton} />}>{label}</DropdownMenuTrigger><DropdownMenuContent align="start" className={styles.menu}>{children}</DropdownMenuContent></DropdownMenu>;
}

export default function ProductsWorkspace() {
  const router = useRouter(); const pathname = usePathname(); const { currency, formatAmount } = useCurrency();
  const [payload, setPayload] = useState<Payload | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [days, setDays] = useState(30); const [query, setQuery] = useState(""); const [status, setStatus] = useState("All"); const [category, setCategory] = useState(""); const [vendor, setVendor] = useState(""); const [tag, setTag] = useState("");
  const [filters, setFilters] = useState(false); const [sort, setSort] = useState("title"); const [ascending, setAscending] = useState(true); const [grid, setGrid] = useState(false);
  const [columns, setColumns] = useState(initialColumns); const [selected, setSelected] = useState<string[]>([]); const [selectedOnly, setSelectedOnly] = useState(false); const [page, setPage] = useState(0); const [pageSize, setPageSize] = useState(50);
  const [action, setAction] = useState<Action | null>(null); const [values, setValues] = useState<string[]>([]); const [text, setText] = useState(""); const [pending, setPending] = useState(false);
  const [edits, setEdits] = useState<{ id: string; title: string; vendor: string; merchandise_type: string }[]>([]); const [report, setReport] = useState<string | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/store/products?days=${days}&currency=${currency}`, { signal, cache: "no-store" }); const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Products could not be loaded.");
      setPayload(result); setError("");
      setSelected(previous => previous.filter(id => result.products.some((p: Product) => p.id === id)));
    } catch (failure) { if (!(failure instanceof DOMException && failure.name === "AbortError")) setError(failure instanceof Error ? failure.message : "Products could not be loaded."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [days, currency]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  useEffect(() => { setPage(0); }, [query, status, category, vendor, tag, selectedOnly, pageSize]);
  const products = payload?.products ?? [];
  const visible = useMemo(() => products.filter(p => (!selectedOnly || selected.includes(p.id)) && (status === "All" || p.status === status.toLowerCase()) && (!category || p.category_id === category) && (!vendor || p.vendor === vendor) && (!tag || p.tags.includes(tag)) && `${p.title} ${p.sku} ${p.slug} ${p.vendor} ${p.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => {
    const av = sort === "inventory" ? stockOf(a) ?? Infinity : sort === "price" ? Number(a.price) : sort === "category" ? payload?.categories.find(c => c.id === a.category_id)?.name ?? "" : String(a[sort] ?? "");
    const bv = sort === "inventory" ? stockOf(b) ?? Infinity : sort === "price" ? Number(b.price) : sort === "category" ? payload?.categories.find(c => c.id === b.category_id)?.name ?? "" : String(b[sort] ?? "");
    return (typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))) * (ascending ? 1 : -1);
  }), [products, selected, selectedOnly, status, category, vendor, tag, query, sort, ascending, payload?.categories]);
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize)); const safePage = Math.min(page, pageCount - 1); const rows = visible.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const allPageSelected = rows.length > 0 && rows.every(p => selected.includes(p.id)); const selectedProducts = products.filter(p => selected.includes(p.id));
  function toggle(id: string) { setSelected(ids => ids.includes(id) ? ids.filter(v => v !== id) : [...ids, id]); }
  function togglePage() { setSelected(ids => allPageSelected ? ids.filter(id => !rows.some(p => p.id === id)) : [...new Set([...ids, ...rows.map(p => p.id)])]); }
  function openAction(key: string, title: string) {
    setAction({ key, title }); setValues([]); setText(""); setError("");
    if (key === "edit") setEdits(selectedProducts.map(({ id, title, vendor, merchandise_type }) => ({ id, title, vendor, merchandise_type })));
  }
  async function commit() {
    if (!action || pending) return;
    setPending(true); setError("");
    const [key, statusValue] = action.key.split(":");
    const finalValues = statusValue ? [statusValue] : key.includes("tags") || key.includes("catalogs") ? [...new Set([...values, ...text.split(",").map(v => v.trim()).filter(Boolean)])] : values;
    try {
      const response = await fetch("/api/store/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selected, action: key, values: finalValues, edits: key === "edit" ? edits : [] }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Products could not be updated.");
      setNotice(`${result.updated} product${result.updated === 1 ? "" : "s"} updated.`); setAction(null); setSelected([]); setSelectedOnly(false); await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Products could not be updated."); }
    finally { setPending(false); }
  }
  const metric = payload?.analytics;
  function sortBy(key: string) { if (key === sort) setAscending(!ascending); else { setSort(key); setAscending(true); } }
  function cell(product: Product, key: string) {
    if (key === "status") return <span className={`${styles.badge} ${product.status === "active" ? styles.active : ""}`}>{product.status[0].toUpperCase() + product.status.slice(1)}{!product.is_listed ? " · Unlisted" : ""}</span>;
    if (key === "inventory") { const stock = stockOf(product); const count = product.variants.filter(v => v.is_active).length; return product.product_type === "digital" ? "Inventory not tracked" : <><span className={stock !== null && stock <= 10 ? styles.low : ""}>{stock ?? "Not tracked"}{stock !== null ? " in stock" : ""}</span>{count > 1 ? ` for ${count} variants` : ""}</>; }
    if (key === "category") return payload?.categories.find(c => c.id === product.category_id)?.name || "Uncategorized";
    if (key === "channels") return <Menu label={<span aria-label={`Sales channels for ${product.title}`}>{product.sales_channels.length}</span>}>{channels.map(channel => <DropdownMenuItem key={channel.id} disabled={!payload?.canManage} onClick={() => { setSelected([product.id]); openAction(product.sales_channels.includes(channel.id) ? "exclude_channels" : "include_channels", "Manage sales channels"); setValues([channel.id]); }}>{product.sales_channels.includes(channel.id) && <IconCheck size={14} />}{channel.name}</DropdownMenuItem>)}</Menu>;
    if (key === "price") return formatRecordedMoney(Number(product.price), product.currency);
    if (key === "type") return product.merchandise_type || "—";
    if (key === "tags" || key === "catalogs") return product[key].join(", ") || "—";
    return product.vendor || "—";
  }
  const valueAction = action && /tags|catalogs|channels|collections/.test(action.key);
  const options = action?.key.includes("channels") ? channels : action?.key.includes("collections") ? payload?.collections ?? [] : [...new Set(products.flatMap(p => action?.key.includes("catalogs") ? p.catalogs : p.tags))].sort().map(name => ({ id: name, name }));

  return <div className={styles.workspace}>
    <header className={styles.header}><h1><IconTag size={17} />Products</h1><div className={styles.headerActions}>
      <Menu label={<><IconEye size={15} /> View as</>}><DropdownMenuItem onClick={() => setGrid(false)}>{!grid && <IconCheck size={14} />}List</DropdownMenuItem><DropdownMenuItem onClick={() => setGrid(true)}>{grid && <IconCheck size={14} />}Grid</DropdownMenuItem></Menu>
      <ProductTransfer products={products} canImport={Boolean(payload?.canManage)} onComplete={() => load()} />
      {payload?.canManage && <button className={styles.primary} onClick={() => router.push(`${pathname}/new`)}>Add product</button>}
    </div></header>
    <section className={styles.metrics} aria-label="Product analytics">
      <Menu label={<><IconCalendar size={14} />{days === 1 ? "Today" : `${days} days`}</>}>
        {[1,7,30].map(d => <DropdownMenuItem className={styles.periodOption} key={d} onClick={() => setDays(d)}><span className={`${styles.radio} ${days === d ? styles.checked : ""}`} /><span>{d === 1 ? "Today" : `Last ${d} days`}<small>{d === 1 ? "Compared to yesterday up to current hour" : `Compared to the previous ${d} days`}</small></span></DropdownMenuItem>)}
      </Menu>
      {[{ key: "sellThrough", title: "Average sell-through rate", value: metric?.sellThrough == null ? "No data" : `${metric.sellThrough}%` }, { key: "daysRemaining", title: "Products by days of inventory remaining", value: metric?.daysRemaining == null ? "No data" : `${metric.daysRemaining} days` }, { key: "grade", title: "ABC product analysis", value: metric ? `${formatAmount(metric.cRevenue)} C` : "No data" }].map(item => <button key={item.key} className={styles.metric} onClick={() => setReport(item.key)}><span>{item.title}</span><strong>{item.value}</strong></button>)}
    </section>
    {error && !action && <div role="alert" className={styles.error}>{error}<button onClick={() => void load()}>Retry</button></div>}
    {notice && <div role="status" className={styles.notice}>{notice}<button aria-label="Dismiss notification" onClick={() => setNotice("")}><IconX size={14} /></button></div>}
    <div className={styles.filterBar}>
      <Menu label={<>{status}<IconSelector size={14} /></>}>{["All","Active","Draft","Archived"].map(value => <DropdownMenuItem key={value} onClick={() => setStatus(value)}>{status === value && <IconCheck size={14} />}{value}</DropdownMenuItem>)}</Menu>
      <label className={styles.search}><IconSearch size={16} /><input aria-label="Search and filter products" placeholder="Search and filter" value={query} onChange={e => setQuery(e.target.value)} />{query && <button aria-label="Clear search" onClick={() => setQuery("")}><IconX size={14} /></button>}</label>
      <button className={styles.iconButton} aria-label="Product filters" aria-expanded={filters} onClick={() => setFilters(!filters)}><IconChevronDown size={15} /></button>
      <Menu iconOnly label={<span aria-label="Display options"><IconLayoutColumns size={16} /></span>}>{Object.entries(columnLabels).map(([key,label]) => <DropdownMenuCheckboxItem key={key} checked={columns.includes(key)} onCheckedChange={checked => setColumns(previous => checked ? [...previous,key] : previous.filter(c => c !== key))}>{label}</DropdownMenuCheckboxItem>)}</Menu>
    </div>
    {filters && <div className={styles.filters}>
      <label>Category<select value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{payload?.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Vendor<select value={vendor} onChange={e => setVendor(e.target.value)}><option value="">All vendors</option>{[...new Set(products.map(p => p.vendor).filter(Boolean))].map(v => <option key={v}>{v}</option>)}</select></label>
      <label>Tag<select value={tag} onChange={e => setTag(e.target.value)}><option value="">All tags</option>{[...new Set(products.flatMap(p => p.tags))].sort().map(v => <option key={v}>{v}</option>)}</select></label>
      <button onClick={() => { setQuery(""); setCategory(""); setVendor(""); setTag(""); setStatus("All"); }}>Clear filters</button>
    </div>}
    {selected.length > 0 && <div className={styles.bulkBar} role="toolbar" aria-label="Selected product actions">
      <input type="checkbox" aria-label="Clear selection" checked onChange={() => { setSelected([]); setSelectedOnly(false); }} />
      <Menu label={<>{selected.length} selected<IconChevronDown size={12} /></>}><DropdownMenuItem onClick={() => setSelected(visible.slice(0, 500).map(p => p.id))}>Select {Math.min(visible.length, 500)} matching products</DropdownMenuItem><DropdownMenuItem onClick={() => { setSelected([]); setSelectedOnly(false); }}>Clear selection</DropdownMenuItem></Menu>
      {payload?.canManage && <><button onClick={() => openAction("edit","Bulk edit products")}>Bulk edit</button><button onClick={() => openAction("status:draft","Set products as draft")}>Set as draft</button><Menu iconOnly label={<span aria-label="More product actions"><IconDots size={17} /></span>}>{bulkActions.map((item,index) => <div key={item.key}>{[4,6,8,10].includes(index) && <DropdownMenuSeparator />}<DropdownMenuItem className={item.key === "delete" ? styles.low : ""} onClick={() => openAction(item.key,item.title)}>{item.icon && <item.icon size={15} />}{item.title}</DropdownMenuItem></div>)}</Menu></>}
      <label className={styles.showSelected}><input type="checkbox" role="switch" checked={selectedOnly} onChange={e => setSelectedOnly(e.target.checked)} />Show all selected</label>
    </div>}
    <div className={styles.tableWrap} aria-busy={loading}>
      {grid ? <div className={styles.grid}>{rows.map(product => <article key={product.id}><input type="checkbox" aria-label={`Select ${product.title}`} checked={selected.includes(product.id)} onChange={() => toggle(product.id)} /><Thumbnail key={product.image_url} src={product.image_url} /><button onClick={() => router.push(`${pathname}/${product.id}`)}>{product.title}</button>{cell(product,"status")}{cell(product,"inventory")}</article>)}</div> : <table className={styles.table}>
        <thead className={selected.length ? styles.hiddenHead : ""}><tr><th><input type="checkbox" aria-label="Select all products on this page" checked={allPageSelected} ref={node => { if (node) node.indeterminate = !allPageSelected && rows.some(p => selected.includes(p.id)); }} onChange={togglePage} /></th><th><button onClick={() => sortBy("title")}>Product {sort === "title" && <IconSelector size={12} />}</button></th>{columns.map(key => <th key={key}><button onClick={() => sortBy(key === "type" ? "merchandise_type" : key)}>{columnLabels[key]}{sort === key && <IconSelector size={12} />}</button></th>)}</tr></thead>
        <tbody>{rows.map(product => <tr key={product.id} className={selected.includes(product.id) ? styles.selected : ""}><td><input type="checkbox" aria-label={`Select ${product.title}`} checked={selected.includes(product.id)} onChange={() => toggle(product.id)} /></td><td><button className={styles.productLink} onClick={() => router.push(`${pathname}/${product.id}`)}><Thumbnail key={product.image_url} src={product.image_url} /><span>{product.title}</span></button></td>{columns.map(key => <td key={key}>{cell(product,key)}</td>)}</tr>)}</tbody>
      </table>}
      {!rows.length && <div className={styles.empty}>{loading ? "Loading products…" : "No products match this view."}</div>}
    </div>
    {visible.length > pageSize && <div className={styles.pagination}><span>{safePage * pageSize + 1}–{Math.min((safePage+1)*pageSize,visible.length)} of {visible.length}</span><button aria-label="Previous page" disabled={safePage === 0} onClick={() => setPage(safePage-1)}><IconChevronLeft size={16} /></button><button aria-label="Next page" disabled={safePage+1 >= pageCount} onClick={() => setPage(safePage+1)}><IconChevronRight size={16} /></button><select aria-label="Products per page" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>{[25,50,100].map(n => <option key={n} value={n}>{n} per page</option>)}</select></div>}
    <button className={styles.learn} onClick={() => setReport("help")}>Learn more about products</button>
    <Dialog open={Boolean(action)} onOpenChange={open => { if (!open && !pending) { setAction(null); setError(""); } }}><DialogContent className={action?.key === "edit" ? styles.editDialog : ""}><DialogHeader><DialogTitle>{action?.title}</DialogTitle><DialogDescription>{action?.key === "delete" ? `${selected.length} products will move to Recently deleted. Restore them within 15 days.` : `Apply changes to ${selected.length} selected product${selected.length === 1 ? "" : "s"}.`}</DialogDescription></DialogHeader>
      {valueAction && <div className={styles.optionList}>{options.map(option => <label key={option.id}><input type="checkbox" checked={values.includes(option.id)} onChange={() => setValues(previous => previous.includes(option.id) ? previous.filter(v => v !== option.id) : [...previous,option.id])} />{option.name}</label>)}{/tags|catalogs/.test(action.key) && <label>{action.key.startsWith("remove") || action.key.startsWith("exclude") ? "Names, separated by commas" : "Add names, separated by commas"}<Input value={text} onChange={e => setText(e.target.value)} placeholder={action.key.includes("tags") ? "summer, sale" : "Wholesale, Retail"} /></label>}{!options.length && /collections/.test(action.key) && <p>No collections exist. Create a collection first.</p>}</div>}
      {action?.key === "edit" && <div className={styles.editTable}><table><thead><tr><th>Title</th><th>Vendor</th><th>Product type</th></tr></thead><tbody>{edits.map((edit,index) => <tr key={edit.id}>{(["title","vendor","merchandise_type"] as const).map(key => <td key={key}><Input aria-label={`${key} for ${edit.title}`} value={edit[key]} onChange={event => setEdits(previous => previous.map((row,i) => i === index ? { ...row,[key]: event.target.value } : row))} /></td>)}</tr>)}</tbody></table></div>}
      {error && <p role="alert" className={styles.low}>{error}</p>}
      <DialogFooter><Button variant="outline" disabled={pending} onClick={() => { setAction(null); setError(""); }}>Cancel</Button><Button variant={action?.key === "delete" ? "destructive" : "default"} disabled={pending || Boolean(valueAction && !values.length && !text.trim()) || (action?.key === "edit" && edits.some(e => !e.title.trim()))} onClick={() => void commit()}>{pending ? "Saving…" : action?.key === "delete" ? "Delete products" : "Save"}</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={Boolean(report)} onOpenChange={open => { if (!open) setReport(null); }}><DialogContent className={styles.editDialog}><DialogHeader><DialogTitle>{report === "help" ? "Managing products" : report === "sellThrough" ? "Average sell-through rate" : report === "daysRemaining" ? "Days of inventory remaining" : "ABC product analysis"}</DialogTitle><DialogDescription>{report === "help" ? "Search by title, SKU, handle, vendor, or tag. Select products for bulk edits, publication, tags, catalogs, and collections. Deleted products can be restored from Recycle bin for 15 days." : `Last ${days} day${days === 1 ? "" : "s"} · ${currency} · India time. Paid, non-cancelled orders only. Sell-through = units sold / (units sold + available stock). Days remaining = available stock / daily units sold. ABC grades use cumulative sales revenue: A 80%, B next 15%, C remaining 5%.`}</DialogDescription></DialogHeader>{report !== "help" && <>{payload?.analyticsError && <p role="alert">{payload.analyticsError}</p>}<div className={styles.editTable}><table><thead><tr><th>Product</th><th>Units sold</th><th>Sell-through</th><th>Days remaining</th><th>Revenue ({currency})</th><th>Grade</th></tr></thead><tbody>{metric?.products.map(row => <tr key={row.id}><td>{row.title}</td><td>{row.units}</td><td>{row.sellThrough == null ? "—" : `${row.sellThrough}%`}</td><td>{row.daysRemaining ?? "—"}</td><td>{formatAmount(row.revenue)}</td><td>{row.grade}</td></tr>)}</tbody></table></div></>}</DialogContent></Dialog>
  </div>;
}
