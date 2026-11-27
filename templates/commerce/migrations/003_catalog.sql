-- ============================================================================
-- Zerocraft Commerce Template — 003_catalog
-- Products and the collision-safe public product id registry.
--
-- Variants are canonical in 004. A compatibility read-only view named
-- product_variants is created there; no duplicate variant table is created.
-- ============================================================================

begin;

create table if not exists public.product_public_id_registry (
  public_id bigint not null primary key,
  reserved_at timestamptz not null default now(),
  constraint product_public_id_registry_13_digit_check
    check (public_id between 1000000000000 and 9999999999999)
);

revoke all on public.product_public_id_registry from public, anon, authenticated;
grant all on public.product_public_id_registry to service_role;

create or replace function private.generate_public_id()
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_candidate bigint;
begin
  loop
    v_candidate := 1000000000000 + floor(random() * 9000000000000)::bigint;
    begin
      insert into public.product_public_id_registry(public_id)
      values (v_candidate);
      return v_candidate;
    exception when unique_violation then
      null;
    end;
  end loop;
end;
$$;

revoke all on function private.generate_public_id() from public, anon;
grant execute on function private.generate_public_id() to authenticated, service_role;

create table if not exists public.products (
  id uuid not null default gen_random_uuid() primary key,
  public_id bigint not null default private.generate_public_id(),
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 255),
  handle text not null check (handle ~ '^[a-z0-9-]+$' and char_length(handle) <= 255),
  description_html text null,
  vendor text null check (vendor is null or char_length(vendor) <= 100),
  product_type text null check (product_type is null or char_length(product_type) <= 100),
  tags text[] not null default '{}'::text[],
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  category_gid text null check (category_gid is null or category_gid ~ '^gid://shopify/TaxonomyCategory/[a-z0-9-]+$'),
  taxonomy_version text null,
  seo_title text null check (seo_title is null or char_length(seo_title) <= 70),
  seo_description text null check (seo_description is null or char_length(seo_description) <= 320),
  requires_shipping boolean not null default true,
  weight_grams integer null check (weight_grams is null or weight_grams >= 0),
  hs_code text null check (hs_code is null or char_length(hs_code) <= 20),
  country_of_origin char(2) null,
  published_at timestamptz null,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_public_id_key unique (public_id),
  constraint products_store_handle_key unique (store_id, handle),
  constraint products_id_store_key unique (id, store_id),
  constraint products_public_id_13_digit_check
    check (public_id between 1000000000000 and 9999999999999)
);

comment on table public.products is
  'Products for one tenant store. Category is a Shopify Taxonomy GID reference; the global taxonomy is never duplicated here.';
comment on column public.products.category_gid is
  'Selected Shopify taxonomy category GID. The category catalogue itself is served by the taxonomy Worker/R2.';
comment on column public.products.public_id is
  'Stable 13-digit public identifier. Never regenerate once assigned.';

create index if not exists products_store_status_idx on public.products(store_id, status);
create index if not exists products_store_updated_idx on public.products(store_id, updated_at desc);
create index if not exists products_category_gid_idx
  on public.products(category_gid) where category_gid is not null;
create index if not exists products_tags_gin_idx on public.products using gin(tags);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- RLS and grants are created in 015.

commit;
