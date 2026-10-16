-- Zerocraft Commerce Foundation
-- Additive migration. Do not run against production without review.
-- Existing store_* tables and records are preserved.

create table if not exists public.store_product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products(id) on delete cascade,
  variant_id uuid references public.store_product_variants(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  alt_text text not null default '',
  media_type text not null default 'image' check (media_type in ('image', 'video', 'document')),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, storage_path)
);

create table if not exists public.store_collections (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  tagline text not null default '',
  description text not null default '',
  image_url text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_collection_products (
  collection_id uuid not null references public.store_collections(id) on delete cascade,
  product_id uuid not null references public.store_products(id) on delete cascade,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  primary key (collection_id, product_id)
);

create table if not exists public.store_variant_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  sort_order integer not null default 0 check (sort_order >= 0),
  unique (product_id, name)
);

create table if not exists public.store_variant_option_values (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.store_variant_options(id) on delete cascade,
  value text not null check (length(trim(value)) between 1 and 120),
  swatch_hex text,
  sort_order integer not null default 0 check (sort_order >= 0),
  unique (option_id, value)
);

create table if not exists public.store_variant_values (
  variant_id uuid not null references public.store_product_variants(id) on delete cascade,
  option_value_id uuid not null references public.store_variant_option_values(id) on delete cascade,
  primary key (variant_id, option_value_id)
);

create table if not exists public.store_inventory_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.store_inventory_levels (
  location_id uuid not null references public.store_inventory_locations(id) on delete cascade,
  variant_id uuid not null references public.store_product_variants(id) on delete cascade,
  on_hand integer not null default 0 check (on_hand >= 0),
  reserved integer not null default 0 check (reserved >= 0 and reserved <= on_hand),
  reorder_point integer not null default 0 check (reorder_point >= 0),
  updated_at timestamptz not null default now(),
  primary key (location_id, variant_id)
);

create table if not exists public.store_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.store_inventory_locations(id),
  variant_id uuid not null references public.store_product_variants(id),
  quantity_delta integer not null check (quantity_delta <> 0),
  reason text not null,
  reference_type text,
  reference_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home',
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text not null default '',
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'IN',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  guest_token text unique,
  currency text not null default 'INR' check (currency = 'INR'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or guest_token is not null)
);

create table if not exists public.store_cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.store_carts(id) on delete cascade,
  variant_id uuid not null references public.store_product_variants(id),
  quantity integer not null check (quantity > 0),
  customization jsonb not null default '{}'::jsonb check (jsonb_typeof(customization) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create table if not exists public.store_wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.store_wishlist_items (
  wishlist_id uuid not null references public.store_wishlists(id) on delete cascade,
  product_id uuid not null references public.store_products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (wishlist_id, product_id)
);

create table if not exists public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  product_id uuid references public.store_products(id) on delete set null,
  variant_id uuid references public.store_product_variants(id) on delete set null,
  title text not null,
  sku text not null default '',
  quantity integer not null check (quantity > 0),
  unit_price_paise bigint not null check (unit_price_paise >= 0),
  currency text not null default 'INR' check (currency = 'INR'),
  customization jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.store_customization_templates (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.store_products(id) on delete set null,
  name text not null,
  slug text not null unique,
  schema jsonb not null default '{}'::jsonb check (jsonb_typeof(schema) = 'object'),
  preview_url text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.storefront_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  title text not null default '',
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.storefront_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  eyebrow text not null default '',
  body text not null default '',
  image_url text not null default '',
  href text not null default '/store/shop',
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

alter table public.store_products add column if not exists price_paise bigint;
alter table public.store_products add column if not exists compare_at_price_paise bigint;
alter table public.store_products add column if not exists currency_code text;
alter table public.store_product_variants add column if not exists price_paise bigint;
alter table public.store_product_variants add column if not exists currency_code text;
alter table public.store_orders add column if not exists customer_id uuid references auth.users(id) on delete set null;
alter table public.store_orders add column if not exists idempotency_key text;

-- Preserve the currency already recorded on legacy rows. New rows default to INR.
update public.store_products set currency_code = upper(coalesce(currency, 'INR')) where currency_code is null;
update public.store_product_variants set currency_code = 'INR' where currency_code is null;
alter table public.store_products alter column currency_code set default 'INR';
alter table public.store_products alter column currency_code set not null;
alter table public.store_product_variants alter column currency_code set default 'INR';
alter table public.store_product_variants alter column currency_code set not null;

create unique index if not exists store_orders_idempotency_key_idx
  on public.store_orders(idempotency_key) where idempotency_key is not null;
create index if not exists store_product_media_product_idx on public.store_product_media(product_id, sort_order);
create index if not exists store_collection_products_product_idx on public.store_collection_products(product_id);
create index if not exists store_inventory_levels_variant_idx on public.store_inventory_levels(variant_id);
create index if not exists store_inventory_movements_variant_idx on public.store_inventory_movements(variant_id, created_at desc);
create index if not exists customer_addresses_user_idx on public.customer_addresses(user_id, is_default desc);
create index if not exists store_cart_items_cart_idx on public.store_cart_items(cart_id);
create index if not exists store_order_items_order_idx on public.store_order_items(order_id);
create index if not exists store_audit_logs_entity_idx on public.store_audit_logs(entity_type, entity_id, created_at desc);

alter table public.store_product_media enable row level security;
alter table public.store_collections enable row level security;
alter table public.store_collection_products enable row level security;
alter table public.store_variant_options enable row level security;
alter table public.store_variant_option_values enable row level security;
alter table public.store_variant_values enable row level security;
alter table public.store_inventory_locations enable row level security;
alter table public.store_inventory_levels enable row level security;
alter table public.store_inventory_movements enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.store_carts enable row level security;
alter table public.store_cart_items enable row level security;
alter table public.store_wishlists enable row level security;
alter table public.store_wishlist_items enable row level security;
alter table public.store_order_items enable row level security;
alter table public.store_customization_templates enable row level security;
alter table public.storefront_sections enable row level security;
alter table public.storefront_banners enable row level security;
alter table public.store_audit_logs enable row level security;

-- Public catalog reads are limited to published/active records.
create policy "Public product media" on public.store_product_media for select
  using (exists (select 1 from public.store_products p where p.id = product_id and p.status = 'active'));
create policy "Public published collections" on public.store_collections for select
  using (status = 'published');
create policy "Public published collection products" on public.store_collection_products for select
  using (exists (select 1 from public.store_collections c where c.id = collection_id and c.status = 'published'));
create policy "Public active variant options" on public.store_variant_options for select
  using (exists (select 1 from public.store_products p where p.id = product_id and p.status = 'active'));
create policy "Public active variant option values" on public.store_variant_option_values for select
  using (exists (select 1 from public.store_variant_options o join public.store_products p on p.id = o.product_id where o.id = option_id and p.status = 'active'));
create policy "Public active variant values" on public.store_variant_values for select
  using (exists (select 1 from public.store_product_variants v join public.store_products p on p.id = v.product_id where v.id = variant_id and v.is_active and p.status = 'active'));
create policy "Public templates" on public.store_customization_templates for select
  using (status = 'published');
create policy "Public storefront sections" on public.storefront_sections for select
  using (is_published);
create policy "Public storefront banners" on public.storefront_banners for select
  using (is_published);

-- Customer-owned records.
create policy "Own customer addresses" on public.customer_addresses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own carts" on public.store_carts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own cart items" on public.store_cart_items for all to authenticated
  using (exists (select 1 from public.store_carts c where c.id = cart_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.store_carts c where c.id = cart_id and c.user_id = (select auth.uid())));
create policy "Own wishlists" on public.store_wishlists for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own wishlist items" on public.store_wishlist_items for all to authenticated
  using (exists (select 1 from public.store_wishlists w where w.id = wishlist_id and w.user_id = (select auth.uid())))
  with check (exists (select 1 from public.store_wishlists w where w.id = wishlist_id and w.user_id = (select auth.uid())));

-- Studio-only operational data. The existing role helper is reused.
create policy "Studio manage product media" on public.store_product_media for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
create policy "Studio manage collections" on public.store_collections for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
create policy "Studio manage collection products" on public.store_collection_products for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
create policy "Studio manage variant options" on public.store_variant_options for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
create policy "Studio manage variant option values" on public.store_variant_option_values for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
create policy "Studio manage variant values" on public.store_variant_values for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
create policy "Studio manage inventory locations" on public.store_inventory_locations for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
create policy "Studio manage inventory levels" on public.store_inventory_levels for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
create policy "Studio manage inventory movements" on public.store_inventory_movements for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
create policy "Studio read order items" on public.store_order_items for select to authenticated using (public.is_studio_member());
create policy "Studio manage templates" on public.store_customization_templates for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
create policy "Studio manage storefront sections" on public.storefront_sections for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
create policy "Studio manage storefront banners" on public.storefront_banners for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
create policy "Studio read audit logs" on public.store_audit_logs for select to authenticated using (public.is_studio_member());
create policy "Studio write audit logs" on public.store_audit_logs for insert to authenticated with check (public.is_studio_member() and actor_id = (select auth.uid()));

grant select on public.store_product_media, public.store_collections, public.store_collection_products,
  public.store_variant_options, public.store_variant_option_values, public.store_variant_values,
  public.store_customization_templates, public.storefront_sections, public.storefront_banners to anon, authenticated;
grant select, insert, update, delete on public.customer_addresses, public.store_carts,
  public.store_cart_items, public.store_wishlists, public.store_wishlist_items to authenticated;
grant select on public.store_order_items, public.store_audit_logs to authenticated;
