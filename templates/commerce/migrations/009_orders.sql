-- ============================================================================
-- Zerocraft Commerce Template — 009_orders
-- Orders, line items, addresses, adjustments, events, and per-store counters.
--
-- Money is stored in integer minor units (paise) plus an ISO currency code.
-- Never use floating point for money.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Per-store monotonic counters (order numbers, invoice numbers).
-- ----------------------------------------------------------------------------
create table if not exists public.store_counters (
  store_id uuid not null references public.stores(id) on delete cascade,
  key text not null check (key ~ '^[a-z_]{2,40}$'),
  next_value bigint not null default 1 check (next_value > 0),
  updated_at timestamptz not null default now(),
  primary key (store_id, key)
);

drop trigger if exists store_counters_set_updated_at on public.store_counters;
create trigger store_counters_set_updated_at
  before update on public.store_counters
  for each row execute function public.set_updated_at();

create or replace function private.next_counter(p_store_id uuid, p_key text)
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_value bigint;
begin
  insert into public.store_counters (store_id, key, next_value)
  values (p_store_id, p_key, 2)
  on conflict (store_id, key) do update
    set next_value = public.store_counters.next_value + 1,
        updated_at = now()
  returning next_value - 1 into v_value;

  return v_value;
end;
$$;

revoke all on function private.next_counter(uuid, text) from public, anon;
grant execute on function private.next_counter(uuid, text) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Orders
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid not null default gen_random_uuid() primary key,
  public_id bigint not null default private.generate_public_id(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_number bigint not null,
  customer_id uuid null,
  email citext null,
  phone text null check (phone is null or char_length(phone) <= 32),
  currency char(3) not null default 'INR',
  presentment_currency char(3) null,
  subtotal_paise bigint not null default 0 check (subtotal_paise >= 0),
  discount_total_paise bigint not null default 0 check (discount_total_paise >= 0),
  shipping_total_paise bigint not null default 0 check (shipping_total_paise >= 0),
  tax_total_paise bigint not null default 0 check (tax_total_paise >= 0),
  total_paise bigint not null default 0 check (total_paise >= 0),
  refunded_paise bigint not null default 0 check (refunded_paise >= 0),
  financial_status text not null default 'pending'
    check (financial_status in (
      'pending', 'authorized', 'paid', 'partially_paid', 'partially_refunded',
      'refunded', 'voided', 'expired'
    )),
  fulfillment_status text not null default 'unfulfilled'
    check (fulfillment_status in (
      'unfulfilled', 'partially_fulfilled', 'fulfilled', 'restocked', 'cancelled'
    )),
  status text not null default 'open'
    check (status in ('open', 'closed', 'cancelled', 'archived')),
  source_name text not null default 'admin'
    check (source_name in ('admin', 'online_store', 'pos', 'api', 'import')),
  channel_id uuid null,
  location_id uuid null,
  cart_token text null,
  checkout_token text null,
  note text null check (note is null or char_length(note) <= 2000),
  tags text[] not null default '{}'::text[],
  cancel_reason text null
    check (cancel_reason is null or cancel_reason in (
      'customer', 'fraud', 'inventory', 'declined', 'other'
    )),
  cancelled_at timestamptz null,
  closed_at timestamptz null,
  placed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_public_id_key unique (public_id),
  constraint orders_store_number_key unique (store_id, order_number),
  constraint orders_id_store_key unique (id, store_id),
  constraint orders_customer_fk
    foreign key (customer_id, store_id)
    references public.customers(id, store_id)
    on delete set null
);

create index if not exists orders_store_placed_idx on public.orders(store_id, placed_at desc);
create index if not exists orders_store_financial_idx on public.orders(store_id, financial_status);
create index if not exists orders_store_fulfillment_idx on public.orders(store_id, fulfillment_status);
create index if not exists orders_customer_idx on public.orders(customer_id);
create index if not exists orders_tags_gin_idx on public.orders using gin(tags);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Line items
-- ----------------------------------------------------------------------------
create table if not exists public.order_line_items (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null,
  product_id uuid null,
  variant_id uuid null,
  title text not null check (char_length(trim(title)) between 1 and 255),
  variant_title text null check (variant_title is null or char_length(variant_title) <= 255),
  sku text null check (sku is null or char_length(sku) <= 64),
  quantity integer not null check (quantity > 0),
  price_paise bigint not null check (price_paise >= 0),
  total_discount_paise bigint not null default 0 check (total_discount_paise >= 0),
  tax_paise bigint not null default 0 check (tax_paise >= 0),
  requires_shipping boolean not null default true,
  taxable boolean not null default true,
  properties jsonb not null default '{}'::jsonb
    check (jsonb_typeof(properties) = 'object'),
  position integer not null default 1 check (position > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_line_items_order_fk
    foreign key (order_id, store_id)
    references public.orders(id, store_id)
    on delete cascade,
  constraint order_line_items_product_fk
    foreign key (product_id, store_id)
    references public.products(id, store_id)
    on delete set null,
  constraint order_line_items_variant_fk
    foreign key (variant_id, store_id)
    references public.variants(id, store_id)
    on delete set null
);

create index if not exists order_line_items_order_idx
  on public.order_line_items(order_id, position);
create index if not exists order_line_items_variant_idx
  on public.order_line_items(variant_id);

drop trigger if exists order_line_items_set_updated_at on public.order_line_items;
create trigger order_line_items_set_updated_at
  before update on public.order_line_items
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Address snapshots (never join live customer addresses at read time)
-- ----------------------------------------------------------------------------
create table if not exists public.order_addresses (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null,
  kind text not null check (kind in ('billing', 'shipping')),
  first_name text null,
  last_name text null,
  company text null,
  address1 text null,
  address2 text null,
  city text null,
  province text null,
  province_code text null,
  country text null,
  country_code char(2) null,
  postal_code text null,
  phone text null,
  email citext null,
  constraint order_addresses_order_kind_key unique (order_id, kind),
  constraint order_addresses_order_fk
    foreign key (order_id, store_id)
    references public.orders(id, store_id)
    on delete cascade
);

-- ----------------------------------------------------------------------------
-- Discounts and tax lines
-- ----------------------------------------------------------------------------
create table if not exists public.order_adjustments (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null,
  kind text not null check (kind in ('discount', 'shipping', 'tax', 'fee', 'refund')),
  title text not null check (char_length(trim(title)) between 1 and 255),
  code text null check (code is null or char_length(code) <= 64),
  amount_paise bigint not null,
  rate numeric(9, 6) null,
  tax_number text null,
  created_at timestamptz not null default now(),
  constraint order_adjustments_order_fk
    foreign key (order_id, store_id)
    references public.orders(id, store_id)
    on delete cascade
);

create index if not exists order_adjustments_order_idx on public.order_adjustments(order_id);

-- ----------------------------------------------------------------------------
-- Order timeline (append-only)
-- ----------------------------------------------------------------------------
create table if not exists public.order_events (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null,
  event_type text not null check (char_length(event_type) between 1 and 64),
  actor_type text not null default 'system'
    check (actor_type in ('system', 'member', 'customer', 'provider')),
  actor_member_id uuid null,
  message text null check (message is null or char_length(message) <= 1000),
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  constraint order_events_order_fk
    foreign key (order_id, store_id)
    references public.orders(id, store_id)
    on delete cascade
);

create index if not exists order_events_order_created_idx
  on public.order_events(order_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Customer aggregates
-- ----------------------------------------------------------------------------
create or replace function private.refresh_customer_stats(p_customer_id uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.customers c
  set orders_count = s.cnt,
      total_spent_paise = s.total,
      last_order_at = s.last_at,
      updated_at = now()
  from (
    select
      count(*) filter (where status <> 'cancelled') as cnt,
      coalesce(sum(total_paise - refunded_paise) filter (where status <> 'cancelled'), 0) as total,
      max(placed_at) filter (where status <> 'cancelled') as last_at
    from public.orders
    where customer_id = p_customer_id
  ) s
  where c.id = p_customer_id;
$$;

revoke all on function private.refresh_customer_stats(uuid) from public, anon;
grant execute on function private.refresh_customer_stats(uuid) to authenticated, service_role;

create or replace function private.orders_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_customer_stats(old.customer_id);
    return old;
  end if;

  if new.customer_id is not null then
    perform private.refresh_customer_stats(new.customer_id);
  end if;
  if tg_op = 'UPDATE' and old.customer_id is distinct from new.customer_id
     and old.customer_id is not null then
    perform private.refresh_customer_stats(old.customer_id);
  end if;

  return new;
end;
$$;

revoke all on function private.orders_after_change() from public, anon;

drop trigger if exists orders_refresh_customer_stats on public.orders;
create trigger orders_refresh_customer_stats
  after insert or update of total_paise, refunded_paise, status, customer_id or delete
  on public.orders
  for each row execute function private.orders_after_change();

-- RLS and grants are created in 015.

commit;
