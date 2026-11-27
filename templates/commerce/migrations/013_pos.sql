-- ============================================================================
-- Zerocraft Commerce Template — 013_pos
-- Point-of-sale devices, register sessions, cash movements, and settings.
-- ============================================================================

begin;

create table if not exists public.pos_devices (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  location_id uuid null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  device_type text not null default 'tablet'
    check (device_type in ('tablet', 'phone', 'terminal', 'printer', 'cash_drawer', 'other')),
  status text not null default 'offline'
    check (status in ('online', 'offline', 'deactivated')),
  device_fingerprint text null check (device_fingerprint is null or char_length(device_fingerprint) <= 200),
  registered_at timestamptz not null default now(),
  last_seen_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pos_devices_id_store_key unique (id, store_id),
  constraint pos_devices_store_name_key unique (store_id, name),
  constraint pos_devices_location_fk
    foreign key (location_id, store_id)
    references public.locations(id, store_id)
    on delete set null
);

create index if not exists pos_devices_store_status_idx on public.pos_devices(store_id, status);

drop trigger if exists pos_devices_set_updated_at on public.pos_devices;
create trigger pos_devices_set_updated_at
  before update on public.pos_devices
  for each row execute function public.set_updated_at();

create table if not exists public.pos_register_sessions (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  location_id uuid not null,
  device_id uuid null,
  opened_by_member_id uuid null,
  closed_by_member_id uuid null,
  status text not null default 'open'
    check (status in ('open', 'closed', 'reconciled')),
  opening_float_paise bigint not null default 0 check (opening_float_paise >= 0),
  expected_cash_paise bigint null check (expected_cash_paise is null or expected_cash_paise >= 0),
  counted_cash_paise bigint null check (counted_cash_paise is null or counted_cash_paise >= 0),
  variance_paise bigint null,
  notes text null check (notes is null or char_length(notes) <= 1000),
  opened_at timestamptz not null default now(),
  closed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pos_register_sessions_id_store_key unique (id, store_id),
  constraint pos_register_sessions_location_fk
    foreign key (location_id, store_id)
    references public.locations(id, store_id)
    on delete restrict,
  constraint pos_register_sessions_device_fk
    foreign key (device_id, store_id)
    references public.pos_devices(id, store_id)
    on delete set null
);

create unique index if not exists pos_register_sessions_one_open_idx
  on public.pos_register_sessions(location_id)
  where status = 'open';
create index if not exists pos_register_sessions_store_opened_idx
  on public.pos_register_sessions(store_id, opened_at desc);

drop trigger if exists pos_register_sessions_set_updated_at on public.pos_register_sessions;
create trigger pos_register_sessions_set_updated_at
  before update on public.pos_register_sessions
  for each row execute function public.set_updated_at();

create table if not exists public.pos_cash_movements (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  session_id uuid not null,
  kind text not null
    check (kind in ('pay_in', 'pay_out', 'sale', 'refund', 'opening_float', 'closing_count')),
  amount_paise bigint not null check (amount_paise <> 0),
  reason text null check (reason is null or char_length(reason) <= 500),
  order_id uuid null,
  actor_member_id uuid null,
  created_at timestamptz not null default now(),
  constraint pos_cash_movements_session_fk
    foreign key (session_id, store_id)
    references public.pos_register_sessions(id, store_id)
    on delete cascade,
  constraint pos_cash_movements_order_fk
    foreign key (order_id, store_id)
    references public.orders(id, store_id)
    on delete set null
);

create index if not exists pos_cash_movements_session_idx
  on public.pos_cash_movements(session_id, created_at desc);

create table if not exists public.pos_settings (
  store_id uuid not null primary key references public.stores(id) on delete cascade,
  receipt_header text null check (receipt_header is null or char_length(receipt_header) <= 1000),
  receipt_footer text null check (receipt_footer is null or char_length(receipt_footer) <= 1000),
  auto_print_receipt boolean not null default false,
  allow_discounts boolean not null default true,
  max_discount_percent numeric(5, 2) not null default 100
    check (max_discount_percent between 0 and 100),
  require_manager_for_refund boolean not null default true,
  cash_rounding text not null default 'none'
    check (cash_rounding in ('none', 'nearest_1', 'nearest_5', 'nearest_10')),
  settings jsonb not null default '{}'::jsonb
    check (jsonb_typeof(settings) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists pos_settings_set_updated_at on public.pos_settings;
create trigger pos_settings_set_updated_at
  before update on public.pos_settings
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Close a register session with reconciliation.
-- ----------------------------------------------------------------------------
create or replace function public.close_pos_session(
  p_session_id uuid,
  p_counted_cash_paise bigint,
  p_notes text default null
)
returns public.pos_register_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.pos_register_sessions;
  v_expected bigint;
begin
  select * into v_session
  from public.pos_register_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'register session not found';
  end if;

  if not private.can_access_store(v_session.store_id) then
    raise exception 'not authorized for this store' using errcode = '42501';
  end if;

  if v_session.status <> 'open' then
    raise exception 'register session is not open';
  end if;

  select v_session.opening_float_paise + coalesce(sum(amount_paise), 0)
    into v_expected
  from public.pos_cash_movements
  where session_id = p_session_id
    and kind in ('sale', 'refund', 'pay_in', 'pay_out');

  update public.pos_register_sessions
  set status = 'closed',
      closed_by_member_id = private.current_member_id(),
      expected_cash_paise = v_expected,
      counted_cash_paise = p_counted_cash_paise,
      variance_paise = p_counted_cash_paise - v_expected,
      notes = coalesce(p_notes, notes),
      closed_at = now()
  where id = p_session_id
  returning * into v_session;

  return v_session;
end;
$$;

revoke all on function public.close_pos_session(uuid, bigint, text) from public, anon;
grant execute on function public.close_pos_session(uuid, bigint, text) to authenticated, service_role;

-- RLS and grants are created in 015.

commit;
