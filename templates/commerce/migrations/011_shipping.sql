-- ============================================================================
-- Zerocraft Commerce Template — 011_shipping
-- Shipping configuration, fulfillment records, and tracking.
-- ============================================================================

begin;

create table if not exists public.shipping_profiles (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipping_profiles_id_store_key unique (id, store_id),
  constraint shipping_profiles_store_name_key unique (store_id, name)
);

create unique index if not exists shipping_profiles_one_default_idx
  on public.shipping_profiles(store_id) where is_default;

drop trigger if exists shipping_profiles_set_updated_at on public.shipping_profiles;
create trigger shipping_profiles_set_updated_at
  before update on public.shipping_profiles
  for each row execute function public.set_updated_at();

create table if not exists public.shipping_zones (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  profile_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  countries text[] not null default '{}'::text[],
  regions text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipping_zones_id_store_key unique (id, store_id),
  constraint shipping_zones_profile_fk
    foreign key (profile_id, store_id)
    references public.shipping_profiles(id, store_id)
    on delete cascade
);

drop trigger if exists shipping_zones_set_updated_at on public.shipping_zones;
create trigger shipping_zones_set_updated_at
  before update on public.shipping_zones
  for each row execute function public.set_updated_at();

create table if not exists public.shipping_rates (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  zone_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  rate_paise bigint not null default 0 check (rate_paise >= 0),
  min_order_paise bigint null check (min_order_paise is null or min_order_paise >= 0),
  max_order_paise bigint null check (max_order_paise is null or max_order_paise >= 0),
  min_weight_grams integer null check (min_weight_grams is null or min_weight_grams >= 0),
  max_weight_grams integer null check (max_weight_grams is null or max_weight_grams >= 0),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipping_rates_zone_fk
    foreign key (zone_id, store_id)
    references public.shipping_zones(id, store_id)
    on delete cascade
);

drop trigger if exists shipping_rates_set_updated_at on public.shipping_rates;
create trigger shipping_rates_set_updated_at
  before update on public.shipping_rates
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Fulfillments
-- ----------------------------------------------------------------------------
create table if not exists public.fulfillments (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null,
  location_id uuid null,
  status text not null default 'pending'
    check (status in ('pending', 'open', 'in_transit', 'delivered', 'failure', 'cancelled')),
  tracking_company text null check (tracking_company is null or char_length(tracking_company) <= 120),
  tracking_number text null check (tracking_number is null or char_length(tracking_number) <= 120),
  tracking_url text null check (tracking_url is null or char_length(tracking_url) <= 2048),
  carrier_status text null check (carrier_status is null or char_length(carrier_status) <= 120),
  shipped_at timestamptz null,
  delivered_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fulfillments_id_store_key unique (id, store_id),
  constraint fulfillments_order_fk
    foreign key (order_id, store_id)
    references public.orders(id, store_id)
    on delete cascade,
  constraint fulfillments_location_fk
    foreign key (location_id, store_id)
    references public.locations(id, store_id)
    on delete set null
);

create index if not exists fulfillments_order_idx on public.fulfillments(order_id, created_at desc);
create index if not exists fulfillments_store_status_idx on public.fulfillments(store_id, status);

drop trigger if exists fulfillments_set_updated_at on public.fulfillments;
create trigger fulfillments_set_updated_at
  before update on public.fulfillments
  for each row execute function public.set_updated_at();

create table if not exists public.fulfillment_line_items (
  fulfillment_id uuid not null references public.fulfillments(id) on delete cascade,
  order_line_item_id uuid not null references public.order_line_items(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  primary key (fulfillment_id, order_line_item_id)
);

create index if not exists fulfillment_line_items_line_idx
  on public.fulfillment_line_items(order_line_item_id);

-- ----------------------------------------------------------------------------
-- Derive order fulfillment status from fulfillment line quantities.
-- ----------------------------------------------------------------------------
create or replace function private.recalculate_order_fulfillment(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ordered integer;
  v_fulfilled integer;
begin
  select coalesce(sum(quantity), 0)
    into v_ordered
  from public.order_line_items
  where order_id = p_order_id;

  select coalesce(sum(fli.quantity), 0)
    into v_fulfilled
  from public.fulfillment_line_items fli
  join public.fulfillments f on f.id = fli.fulfillment_id
  where f.order_id = p_order_id
    and f.status not in ('cancelled', 'failure');

  update public.orders
  set fulfillment_status = case
        when v_fulfilled <= 0 then 'unfulfilled'
        when v_fulfilled >= v_ordered then 'fulfilled'
        else 'partially_fulfilled'
      end,
      updated_at = now()
  where id = p_order_id
    and status = 'open';
end;
$$;

revoke all on function private.recalculate_order_fulfillment(uuid) from public, anon;
grant execute on function private.recalculate_order_fulfillment(uuid) to authenticated, service_role;

-- RLS and grants are created in 015.

commit;
