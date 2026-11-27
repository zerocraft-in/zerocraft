-- ============================================================================
-- Zerocraft Commerce Template — 008_customers
-- Customer aggregate and addresses.
--
-- Customer identity is scoped to the tenant store. A customer may be linked to
-- a Zerocraft central identity through central_customer_id, but this table is
-- never an authentication source.
-- ============================================================================

begin;

create table if not exists public.customers (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  central_customer_id uuid null,
  email citext null,
  phone text null check (phone is null or char_length(phone) <= 32),
  first_name text null check (first_name is null or char_length(first_name) <= 100),
  last_name text null check (last_name is null or char_length(last_name) <= 100),
  display_name text null check (display_name is null or char_length(display_name) <= 200),
  note text null check (note is null or char_length(note) <= 2000),
  tags text[] not null default '{}'::text[],
  state text not null default 'enabled'
    check (state in ('enabled', 'disabled', 'invited')),
  verified_email boolean not null default false,
  tax_exempt boolean not null default false,
  tax_exemptions text[] not null default '{}'::text[],
  accepts_marketing boolean not null default false,
  marketing_opt_in_at timestamptz null,
  default_address_id uuid null,
  orders_count integer not null default 0 check (orders_count >= 0),
  total_spent_paise bigint not null default 0 check (total_spent_paise >= 0),
  last_order_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_id_store_key unique (id, store_id)
);

create unique index if not exists customers_store_email_key
  on public.customers(store_id, lower(email)) where email is not null;
create unique index if not exists customers_store_phone_key
  on public.customers(store_id, phone) where phone is not null;
create unique index if not exists customers_store_central_key
  on public.customers(store_id, central_customer_id) where central_customer_id is not null;
create index if not exists customers_store_created_idx
  on public.customers(store_id, created_at desc);
create index if not exists customers_tags_gin_idx
  on public.customers using gin(tags);

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Addresses
-- ----------------------------------------------------------------------------
create table if not exists public.customer_addresses (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid not null,
  label text null check (label is null or char_length(label) <= 60),
  first_name text null check (first_name is null or char_length(first_name) <= 100),
  last_name text null check (last_name is null or char_length(last_name) <= 100),
  company text null check (company is null or char_length(company) <= 150),
  address1 text null check (address1 is null or char_length(address1) <= 255),
  address2 text null check (address2 is null or char_length(address2) <= 255),
  city text null check (city is null or char_length(city) <= 120),
  province text null check (province is null or char_length(province) <= 120),
  province_code text null check (province_code is null or char_length(province_code) <= 10),
  country text null check (country is null or char_length(country) <= 120),
  country_code char(2) null,
  postal_code text null check (postal_code is null or char_length(postal_code) <= 20),
  phone text null check (phone is null or char_length(phone) <= 32),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_addresses_id_store_key unique (id, store_id),
  constraint customer_addresses_customer_fk
    foreign key (customer_id, store_id)
    references public.customers(id, store_id)
    on delete cascade
);

create index if not exists customer_addresses_customer_idx
  on public.customer_addresses(customer_id);
create unique index if not exists customer_addresses_one_default_idx
  on public.customer_addresses(customer_id) where is_default;

drop trigger if exists customer_addresses_set_updated_at on public.customer_addresses;
create trigger customer_addresses_set_updated_at
  before update on public.customer_addresses
  for each row execute function public.set_updated_at();

-- Default address pointer is added after the address table exists.
alter table public.customers
  drop constraint if exists customers_default_address_fk;
alter table public.customers
  add constraint customers_default_address_fk
  foreign key (default_address_id, store_id)
  references public.customer_addresses(id, store_id)
  on delete set null;

-- ----------------------------------------------------------------------------
-- Keep counters current when orders are inserted/updated (009 defines orders;
-- the triggers are created there so this migration stays order-independent).
-- ----------------------------------------------------------------------------

-- RLS and grants are created in 015.

commit;
