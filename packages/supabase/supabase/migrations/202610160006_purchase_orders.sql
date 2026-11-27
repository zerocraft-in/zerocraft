-- Purchase order tracking for the Studio operations workspace.
create table if not exists public.store_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 160),
  email text not null default '',
  phone text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name)
);

create table if not exists public.store_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  supplier_id uuid not null references public.store_suppliers(id),
  location_id uuid not null references public.store_inventory_locations(id),
  status text not null default 'draft' check (status in ('draft','ordered','partial','received','cancelled')),
  expected_at date,
  notes text not null default '',
  currency text not null default 'INR' check (currency = 'INR'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.store_purchase_orders(id) on delete cascade,
  variant_id uuid not null references public.store_product_variants(id),
  quantity_ordered integer not null check (quantity_ordered > 0),
  quantity_received integer not null default 0 check (quantity_received >= 0 and quantity_received <= quantity_ordered),
  unit_cost_paise bigint not null default 0 check (unit_cost_paise >= 0),
  created_at timestamptz not null default now(),
  unique (purchase_order_id, variant_id)
);

create index if not exists store_purchase_orders_status_idx on public.store_purchase_orders(status, expected_at);
create index if not exists store_purchase_order_items_variant_idx on public.store_purchase_order_items(variant_id);

alter table public.store_suppliers enable row level security;
alter table public.store_purchase_orders enable row level security;
alter table public.store_purchase_order_items enable row level security;

drop policy if exists "Studio manage suppliers" on public.store_suppliers;
create policy "Studio manage suppliers" on public.store_suppliers for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
drop policy if exists "Studio manage purchase orders" on public.store_purchase_orders;
create policy "Studio manage purchase orders" on public.store_purchase_orders for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
drop policy if exists "Studio manage purchase order items" on public.store_purchase_order_items;
create policy "Studio manage purchase order items" on public.store_purchase_order_items for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
