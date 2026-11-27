-- Product and category catalog for Studio commerce management.
-- Apply after admin-mvp.sql. Store order/payment behavior is unchanged.

create table if not exists public.store_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  image_url text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.store_categories(id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 180),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  product_type text not null default 'physical' check (product_type in ('physical', 'digital')),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  sku text not null unique,
  price numeric(12,2) not null default 0 check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= price),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  stock integer check (stock is null or stock >= 0),
  image_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products(id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 100),
  sku text not null unique,
  options jsonb not null default '{}'::jsonb check (jsonb_typeof(options) = 'object'),
  price numeric(12,2) not null check (price >= 0),
  stock integer check (stock is null or stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_products_category_idx on public.store_products(category_id);
create index if not exists store_products_status_idx on public.store_products(status);
create index if not exists store_variants_product_idx on public.store_product_variants(product_id);

alter table public.store_categories enable row level security;
alter table public.store_products enable row level security;
alter table public.store_product_variants enable row level security;

drop policy if exists "Public active store categories" on public.store_categories;
create policy "Public active store categories" on public.store_categories for select
  using (is_active or public.is_studio_member());
drop policy if exists "Studio manage store categories" on public.store_categories;
create policy "Studio manage store categories" on public.store_categories for all to authenticated
  using (public.is_studio_member()) with check (public.is_studio_member());

drop policy if exists "Public active store products" on public.store_products;
create policy "Public active store products" on public.store_products for select
  using (status = 'active' or public.is_studio_member());
drop policy if exists "Studio manage store products" on public.store_products;
create policy "Studio manage store products" on public.store_products for all to authenticated
  using (public.is_studio_member()) with check (public.is_studio_member());

drop policy if exists "Public active store variants" on public.store_product_variants;
create policy "Public active store variants" on public.store_product_variants for select
  using (is_active or public.is_studio_member());
drop policy if exists "Studio manage store variants" on public.store_product_variants;
create policy "Studio manage store variants" on public.store_product_variants for all to authenticated
  using (public.is_studio_member()) with check (public.is_studio_member());

grant select on public.store_categories, public.store_products, public.store_product_variants to anon, authenticated;
grant insert, update, delete on public.store_categories, public.store_products, public.store_product_variants to authenticated;

-- Replace a product's variant set in one transaction so a duplicate SKU never
-- leaves an edited product with its previous variants silently removed.
create or replace function public.studio_replace_product_variants(p_product_id uuid, p_variants jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not public.is_studio_member() then raise exception 'Studio access required.'; end if;
  if jsonb_typeof(p_variants) <> 'array' then raise exception 'Variants must be an array.'; end if;
  delete from public.store_product_variants where product_id = p_product_id;
  insert into public.store_product_variants (product_id, label, sku, options, price, stock, is_active)
  select p_product_id, v.label, v.sku, coalesce(v.options, '{}'::jsonb), v.price, v.stock, coalesce(v.is_active, true)
  from jsonb_to_recordset(p_variants) as v(label text, sku text, options jsonb, price numeric, stock integer, is_active boolean);
end;
$$;
revoke all on function public.studio_replace_product_variants(uuid, jsonb) from public;
grant execute on function public.studio_replace_product_variants(uuid, jsonb) to authenticated;

-- Give the dashboard exact all-time order totals without truncating to a page
-- of records. The invoker's order-table RLS policies still apply.
create or replace function public.studio_store_order_summary()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'count', count(*),
    'pending', count(*) filter (where status = 'pending'),
    'paidByCurrency', coalesce((
      select jsonb_object_agg(revenue.currency, revenue.amount)
      from (
        select currency, sum(total) as amount
        from public.store_orders
        where payment_status = 'paid' and status <> 'cancelled'
        group by currency
      ) as revenue
    ), '{}'::jsonb)
  )
  from public.store_orders;
$$;
revoke all on function public.studio_store_order_summary() from public;
grant execute on function public.studio_store_order_summary() to authenticated;
