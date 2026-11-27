-- ============================================================================
-- Zerocraft Commerce Template — 007_inventory
-- Locations, inventory items, per-location levels, and an append-only
-- stock movement ledger.
--
-- There is exactly one physical inventory model here (inventory_items +
-- inventory_levels + inventory_movements). No compatibility duplicate table
-- is created for inventory; the Platform template never had one.
-- ============================================================================

begin;

create table if not exists public.locations (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  code text not null check (code ~ '^[A-Z0-9-]{2,20}$'),
  kind text not null default 'warehouse'
    check (kind in ('warehouse', 'retail', 'popup', 'virtual')),
  address jsonb null check (address is null or jsonb_typeof(address) = 'object'),
  contact_phone text null,
  contact_email citext null,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'archived')),
  is_default boolean not null default false,
  fulfills_online_orders boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint locations_store_code_key unique (store_id, code),
  constraint locations_id_store_key unique (id, store_id)
);

create unique index if not exists locations_one_default_idx
  on public.locations(store_id) where is_default;
create index if not exists locations_store_status_idx on public.locations(store_id, status);

drop trigger if exists locations_set_updated_at on public.locations;
create trigger locations_set_updated_at
  before update on public.locations
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Inventory item: one row per variant (1:1).
-- ----------------------------------------------------------------------------
create table if not exists public.inventory_items (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  variant_id uuid not null,
  sku text null check (sku is null or char_length(sku) between 1 and 64),
  tracked boolean not null default true,
  country_code_of_origin char(2) null,
  province_code_of_origin text null,
  harmonized_system_code text null check (harmonized_system_code is null or char_length(harmonized_system_code) <= 20),
  requires_shipping boolean not null default true,
  unit_cost_paise bigint null check (unit_cost_paise is null or unit_cost_paise >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_items_variant_key unique (variant_id),
  constraint inventory_items_id_store_key unique (id, store_id),
  constraint inventory_items_variant_fk
    foreign key (variant_id, store_id)
    references public.variants(id, store_id)
    on delete cascade
);

create index if not exists inventory_items_store_sku_idx on public.inventory_items(store_id, sku);

drop trigger if exists inventory_items_set_updated_at on public.inventory_items;
create trigger inventory_items_set_updated_at
  before update on public.inventory_items
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Per-location stock levels.
--
-- available is derived from on_hand - committed - safety_stock when the row is
-- written by the stock RPCs, but it is stored to keep read queries cheap. The
-- movement ledger remains the source of truth for history.
-- ----------------------------------------------------------------------------
create table if not exists public.inventory_levels (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  inventory_item_id uuid not null,
  location_id uuid not null,
  on_hand integer not null default 0 check (on_hand >= 0),
  committed integer not null default 0 check (committed >= 0),
  incoming integer not null default 0 check (incoming >= 0),
  safety_stock integer not null default 0 check (safety_stock >= 0),
  available integer generated always as (on_hand - committed - safety_stock) stored,
  updated_at timestamptz not null default now(),
  constraint inventory_levels_item_location_key unique (inventory_item_id, location_id),
  constraint inventory_levels_item_fk
    foreign key (inventory_item_id, store_id)
    references public.inventory_items(id, store_id)
    on delete cascade,
  constraint inventory_levels_location_fk
    foreign key (location_id, store_id)
    references public.locations(id, store_id)
    on delete cascade
);

create index if not exists inventory_levels_location_idx
  on public.inventory_levels(store_id, location_id);

drop trigger if exists inventory_levels_set_updated_at on public.inventory_levels;
create trigger inventory_levels_set_updated_at
  before update on public.inventory_levels
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Append-only stock movement ledger.
-- ----------------------------------------------------------------------------
create table if not exists public.inventory_movements (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  inventory_item_id uuid not null,
  location_id uuid not null,
  quantity_delta integer not null check (quantity_delta <> 0),
  reason text not null
    check (reason in (
      'adjustment', 'sale', 'return', 'receive', 'transfer_in', 'transfer_out',
      'damage', 'shrinkage', 'recount', 'initial'
    )),
  reference_type text null
    check (reference_type is null or reference_type in ('order', 'transfer', 'manual', 'import')),
  reference_id uuid null,
  note text null check (note is null or char_length(note) <= 500),
  actor_member_id uuid null,
  created_at timestamptz not null default now(),
  constraint inventory_movements_item_fk
    foreign key (inventory_item_id, store_id)
    references public.inventory_items(id, store_id)
    on delete restrict,
  constraint inventory_movements_location_fk
    foreign key (location_id, store_id)
    references public.locations(id, store_id)
    on delete restrict
);

create index if not exists inventory_movements_item_created_idx
  on public.inventory_movements(inventory_item_id, created_at desc);
create index if not exists inventory_movements_store_created_idx
  on public.inventory_movements(store_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Atomic stock adjustment RPC.
--
-- Writes the movement row first, then updates the level. Both happen in one
-- transaction because the function is invoked as a single statement.
-- ----------------------------------------------------------------------------
create or replace function public.adjust_inventory(
  p_inventory_item_id uuid,
  p_location_id uuid,
  p_quantity_delta integer,
  p_reason text,
  p_note text default null,
  p_reference_type text default 'manual',
  p_reference_id uuid default null
)
returns public.inventory_levels
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.inventory_items;
  v_level public.inventory_levels;
begin
  if p_quantity_delta = 0 then
    raise exception 'quantity_delta must not be zero';
  end if;

  select * into v_item from public.inventory_items where id = p_inventory_item_id;
  if not found then
    raise exception 'inventory item not found';
  end if;

  if not private.can_access_store(v_item.store_id) then
    raise exception 'not authorized for this store' using errcode = '42501';
  end if;

  insert into public.inventory_levels (store_id, inventory_item_id, location_id)
  values (v_item.store_id, p_inventory_item_id, p_location_id)
  on conflict (inventory_item_id, location_id) do nothing;

  select * into v_level
  from public.inventory_levels
  where inventory_item_id = p_inventory_item_id and location_id = p_location_id
  for update;

  insert into public.inventory_movements
    (store_id, inventory_item_id, location_id, quantity_delta, reason,
     reference_type, reference_id, note, actor_member_id)
  values
    (v_item.store_id, p_inventory_item_id, p_location_id, p_quantity_delta, p_reason,
     p_reference_type, p_reference_id, p_note, private.current_member_id());

  update public.inventory_levels
  set on_hand = on_hand + p_quantity_delta
  where id = v_level.id
    and on_hand + p_quantity_delta >= 0
  returning * into v_level;

  if v_level.id is null then
    raise exception 'adjustment would make on_hand negative';
  end if;

  return v_level;
end;
$$;

revoke all on function public.adjust_inventory(uuid, uuid, integer, text, text, text, uuid)
  from public, anon;
grant execute on function public.adjust_inventory(uuid, uuid, integer, text, text, text, uuid)
  to authenticated, service_role;

-- RLS and grants are created in 015.

commit;
