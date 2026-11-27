-- ============================================================================
-- Zerocraft Commerce Template — 004_product_options_and_variants
-- Canonical variants, normalized option values, and a compatibility view.
--
-- Existing Maara history contains legacy public.product_variants and a newer
-- canonical public.variants. This template creates ONE physical variant table
-- (public.variants) and exposes public.product_variants as a read-only view so
-- older clients can keep reading without a duplicate source of truth.
-- ============================================================================

begin;

create table if not exists public.variants (
  id uuid not null default gen_random_uuid() primary key,
  public_id bigint not null default private.generate_public_id(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null,
  title text not null default 'Default Title'
    check (char_length(trim(title)) between 1 and 255),
  position integer not null default 1 check (position > 0),
  status text not null default 'active' check (status in ('active', 'archived')),
  sku text null check (sku is null or char_length(sku) between 1 and 64),
  barcode text null check (barcode is null or barcode ~ '^[0-9]{8,14}$'),
  price_paise bigint not null default 0 check (price_paise >= 0),
  compare_at_price_paise bigint null check (compare_at_price_paise is null or compare_at_price_paise >= 0),
  cost_paise bigint null check (cost_paise is null or cost_paise >= 0),
  inventory_policy text not null default 'deny' check (inventory_policy in ('deny', 'continue')),
  taxable boolean not null default true,
  tax_code text null,
  requires_shipping boolean not null default true,
  weight_grams integer null check (weight_grams is null or weight_grams >= 0),
  weight_unit text not null default 'g' check (weight_unit in ('g', 'kg', 'oz', 'lb')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint variants_public_id_key unique (public_id),
  constraint variants_store_sku_key unique (store_id, sku),
  constraint variants_id_store_key unique (id, store_id),
  constraint variants_product_fk
    foreign key (product_id, store_id)
    references public.products(id, store_id)
    on delete cascade
);

create unique index if not exists variants_store_barcode_key
  on public.variants(store_id, barcode) where barcode is not null;
create index if not exists variants_product_position_idx
  on public.variants(product_id, position);
create index if not exists variants_store_status_idx
  on public.variants(store_id, status);

drop trigger if exists variants_set_updated_at on public.variants;
create trigger variants_set_updated_at
  before update on public.variants
  for each row execute function public.set_updated_at();

create table if not exists public.product_options (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 50),
  position integer not null check (position between 1 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_options_product_position_key unique (product_id, position),
  constraint product_options_id_store_key unique (id, store_id),
  constraint product_options_product_fk
    foreign key (product_id, store_id)
    references public.products(id, store_id)
    on delete cascade
);

create index if not exists product_options_store_product_idx
  on public.product_options(store_id, product_id);

drop trigger if exists product_options_set_updated_at on public.product_options;
create trigger product_options_set_updated_at
  before update on public.product_options
  for each row execute function public.set_updated_at();

create table if not exists public.product_option_values (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  product_option_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 255),
  position integer not null default 1 check (position > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_option_values_name_key unique (product_option_id, name),
  constraint product_option_values_id_store_key unique (id, store_id),
  constraint product_option_values_option_fk
    foreign key (product_option_id, store_id)
    references public.product_options(id, store_id)
    on delete cascade
);

create index if not exists product_option_values_option_idx
  on public.product_option_values(product_option_id, position);

drop trigger if exists product_option_values_set_updated_at on public.product_option_values;
create trigger product_option_values_set_updated_at
  before update on public.product_option_values
  for each row execute function public.set_updated_at();

create table if not exists public.variant_option_values (
  variant_id uuid not null,
  product_option_value_id uuid not null,
  store_id uuid not null references public.stores(id) on delete cascade,
  position integer not null default 1 check (position > 0),
  primary key (variant_id, product_option_value_id),
  constraint variant_option_values_variant_position_key
    unique (variant_id, position),
  constraint variant_option_values_variant_fk
    foreign key (variant_id, store_id)
    references public.variants(id, store_id)
    on delete cascade,
  constraint variant_option_values_value_fk
    foreign key (product_option_value_id, store_id)
    references public.product_option_values(id, store_id)
    on delete restrict
);

create index if not exists variant_option_values_value_idx
  on public.variant_option_values(product_option_value_id);

-- ----------------------------------------------------------------------------
-- Backward-compatible read-only view. This is deliberately a view, not a
-- table: there is exactly one writable variant model (public.variants).
-- ----------------------------------------------------------------------------
create or replace view public.product_variants
with (security_invoker = true)
as
select
  v.id,
  v.store_id,
  v.product_id,
  v.sku,
  v.barcode,
  max(case when po.position = 1 then pov.name end) as option1,
  max(case when po.position = 2 then pov.name end) as option2,
  max(case when po.position = 3 then pov.name end) as option3,
  coalesce(v.cost_paise, 0) as cost_price_paise,
  v.price_paise as selling_price_paise,
  v.compare_at_price_paise,
  v.weight_grams,
  v.weight_unit,
  v.requires_shipping,
  (v.status = 'active') as is_active,
  v.created_at,
  v.updated_at
from public.variants v
left join public.variant_option_values vov on vov.variant_id = v.id
left join public.product_option_values pov on pov.id = vov.product_option_value_id
left join public.product_options po on po.id = pov.product_option_id
group by
  v.id, v.store_id, v.product_id, v.sku, v.barcode, v.cost_paise,
  v.price_paise, v.compare_at_price_paise, v.weight_grams, v.weight_unit,
  v.requires_shipping, v.status, v.created_at, v.updated_at;

comment on view public.product_variants is
  'Read-only compatibility view over canonical public.variants. Do not create a duplicate variant table.';

revoke all on public.product_variants from public, anon;
grant select on public.product_variants to authenticated, service_role;

-- RLS and grants for the writable tables are created in 015.

commit;
