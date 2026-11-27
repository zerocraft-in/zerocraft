-- ============================================================================
-- Zerocraft Commerce Template — 012_sales_channels
-- Sales channels and per-product publication state.
--
-- A channel is configuration only. Credentials for external channels live in
-- the Zerocraft Platform secret store, never in a customer database.
-- ============================================================================

begin;

create table if not exists public.sales_channels (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  kind text not null
    check (kind in ('online_store', 'pos', 'marketplace', 'api', 'social')),
  status text not null default 'active'
    check (status in ('active', 'paused', 'archived')),
  config jsonb not null default '{}'::jsonb
    check (jsonb_typeof(config) = 'object'),
  central_channel_ref uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_channels_id_store_key unique (id, store_id),
  constraint sales_channels_store_slug_key unique (store_id, slug)
);

create index if not exists sales_channels_store_kind_idx
  on public.sales_channels(store_id, kind, status);

drop trigger if exists sales_channels_set_updated_at on public.sales_channels;
create trigger sales_channels_set_updated_at
  before update on public.sales_channels
  for each row execute function public.set_updated_at();

create table if not exists public.product_publications (
  product_id uuid not null,
  channel_id uuid not null,
  store_id uuid not null references public.stores(id) on delete cascade,
  published_at timestamptz null,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_id, channel_id),
  constraint product_publications_product_fk
    foreign key (product_id, store_id)
    references public.products(id, store_id)
    on delete cascade,
  constraint product_publications_channel_fk
    foreign key (channel_id, store_id)
    references public.sales_channels(id, store_id)
    on delete cascade
);

create index if not exists product_publications_channel_idx
  on public.product_publications(channel_id, visible);

drop trigger if exists product_publications_set_updated_at on public.product_publications;
create trigger product_publications_set_updated_at
  before update on public.product_publications
  for each row execute function public.set_updated_at();

-- Orders now have a channel table to reference.
alter table public.orders
  drop constraint if exists orders_channel_fk;
alter table public.orders
  add constraint orders_channel_fk
  foreign key (channel_id, store_id)
  references public.sales_channels(id, store_id)
  on delete set null;

alter table public.orders
  drop constraint if exists orders_location_fk;
alter table public.orders
  add constraint orders_location_fk
  foreign key (location_id, store_id)
  references public.locations(id, store_id)
  on delete set null;

-- RLS and grants are created in 015.

commit;
