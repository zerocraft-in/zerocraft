-- ============================================================================
-- Zerocraft Commerce Template — 014_audit_and_webhooks
-- Append-only audit log, webhook endpoints, and delivery queue.
--
-- Audit rows are written by SECURITY DEFINER triggers only. Clients can read
-- them with the audit.view permission but can never insert, update, or delete.
-- ============================================================================

begin;

create table if not exists public.audit_logs (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  actor_member_id uuid null,
  actor_central_user_id uuid null,
  action text not null check (char_length(action) between 1 and 100),
  entity_type text not null check (char_length(entity_type) between 1 and 64),
  entity_id uuid null,
  before_data jsonb null check (before_data is null or jsonb_typeof(before_data) = 'object'),
  after_data jsonb null check (after_data is null or jsonb_typeof(after_data) = 'object'),
  request_id text null check (request_id is null or char_length(request_id) <= 100),
  ip_address inet null,
  user_agent text null check (user_agent is null or char_length(user_agent) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_store_created_idx
  on public.audit_logs(store_id, created_at desc);
create index if not exists audit_logs_entity_idx
  on public.audit_logs(store_id, entity_type, entity_id);
create index if not exists audit_logs_actor_idx
  on public.audit_logs(actor_member_id, created_at desc);

comment on table public.audit_logs is
  'Append-only tenant audit trail. Written only by SECURITY DEFINER triggers and server-side service-role code.';

create or replace function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_entity_id uuid;
  v_before jsonb;
  v_after jsonb;
begin
  if tg_op = 'DELETE' then
    v_store_id := old.store_id;
    v_entity_id := old.id;
    v_before := to_jsonb(old);
    v_after := null;
  elsif tg_op = 'UPDATE' then
    v_store_id := new.store_id;
    v_entity_id := new.id;
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
  else
    v_store_id := new.store_id;
    v_entity_id := new.id;
    v_before := null;
    v_after := to_jsonb(new);
  end if;

  if v_store_id is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  insert into public.audit_logs
    (store_id, actor_member_id, action, entity_type, entity_id, before_data, after_data)
  values
    (v_store_id,
     private.current_member_id(),
     lower(tg_op),
     tg_table_name,
     v_entity_id,
     v_before,
     v_after);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.audit_row_change() from public, anon;

-- Attach to security-sensitive tables. High-volume operational rows such as
-- inventory_movements and order_events already form their own ledgers.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'products', 'variants', 'collections', 'media', 'metafields',
    'customers', 'orders', 'order_line_items', 'payments', 'refunds',
    'locations', 'inventory_items', 'inventory_levels',
    'sales_channels', 'pos_devices', 'pos_register_sessions',
    'tenant_members', 'tenant_settings'
  ]
  loop
    execute format('drop trigger if exists audit_row_change on public.%I', v_table);
    execute format(
      'create trigger audit_row_change after insert or update or delete on public.%I for each row execute function private.audit_row_change()',
      v_table
    );
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- Webhooks
-- ----------------------------------------------------------------------------
create table if not exists public.webhook_endpoints (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  url text not null check (url ~ '^https://'),
  description text null check (description is null or char_length(description) <= 500),
  topics text[] not null default '{}'::text[],
  status text not null default 'active'
    check (status in ('active', 'paused', 'disabled')),
  -- Reference into the Platform secret store, never the secret itself.
  signing_secret_ref text null check (signing_secret_ref is null or char_length(signing_secret_ref) <= 200),
  api_version text not null default '2026-11',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint webhook_endpoints_id_store_key unique (id, store_id)
);

create index if not exists webhook_endpoints_store_status_idx
  on public.webhook_endpoints(store_id, status);

drop trigger if exists webhook_endpoints_set_updated_at on public.webhook_endpoints;
create trigger webhook_endpoints_set_updated_at
  before update on public.webhook_endpoints
  for each row execute function public.set_updated_at();

create table if not exists public.webhook_deliveries (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  endpoint_id uuid not null,
  topic text not null check (char_length(topic) between 1 and 100),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  status text not null default 'pending'
    check (status in ('pending', 'in_flight', 'succeeded', 'failed', 'dead')),
  attempts integer not null default 0 check (attempts >= 0),
  response_status integer null check (response_status is null or response_status between 100 and 599),
  last_error text null check (last_error is null or char_length(last_error) <= 1000),
  next_attempt_at timestamptz null,
  delivered_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint webhook_deliveries_endpoint_fk
    foreign key (endpoint_id, store_id)
    references public.webhook_endpoints(id, store_id)
    on delete cascade
);

create index if not exists webhook_deliveries_pending_idx
  on public.webhook_deliveries(status, next_attempt_at)
  where status in ('pending', 'failed');

drop trigger if exists webhook_deliveries_set_updated_at on public.webhook_deliveries;
create trigger webhook_deliveries_set_updated_at
  before update on public.webhook_deliveries
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Outbox for reliable event publication to the Platform event bus.
-- ----------------------------------------------------------------------------
create table if not exists public.outbox_events (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  topic text not null check (char_length(topic) between 1 and 100),
  aggregate_type text not null check (char_length(aggregate_type) between 1 and 64),
  aggregate_id uuid not null,
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object'),
  status text not null default 'pending'
    check (status in ('pending', 'dispatched', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  dispatched_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default now()
);

create index if not exists outbox_events_pending_idx
  on public.outbox_events(available_at) where status = 'pending';

-- RLS and grants are created in 015.

commit;
