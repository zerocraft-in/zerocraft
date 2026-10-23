-- Combo bundles for the public Zerocraft storefront.
-- Additive migration: existing products, carts and orders are preserved.

create table if not exists public.store_bundles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) between 1 and 120),
  description text not null default '',
  discount_percent numeric(5,2) not null default 15 check (discount_percent >= 0 and discount_percent < 100),
  image_url text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_bundle_items (
  bundle_id uuid not null references public.store_bundles(id) on delete cascade,
  product_id uuid not null references public.store_products(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  primary key (bundle_id, product_id)
);

create index if not exists store_bundle_items_product_idx on public.store_bundle_items(product_id);
create index if not exists store_bundles_status_idx on public.store_bundles(status, updated_at desc);

alter table public.store_bundles enable row level security;
alter table public.store_bundle_items enable row level security;

create policy "Public published bundles" on public.store_bundles for select
  using (status = 'published');
create policy "Public published bundle items" on public.store_bundle_items for select
  using (exists (select 1 from public.store_bundles b where b.id = bundle_id and b.status = 'published'));

create policy "Studio manage bundles" on public.store_bundles for all to authenticated
  using (public.is_studio_member()) with check (public.is_studio_member());
create policy "Studio manage bundle items" on public.store_bundle_items for all to authenticated
  using (public.is_studio_member()) with check (public.is_studio_member());

grant select on public.store_bundles, public.store_bundle_items to anon, authenticated;
