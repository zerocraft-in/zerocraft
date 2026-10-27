-- Admin-only Gmail workspace credentials and metadata-only audit events.
-- Refresh tokens are encrypted by the CMS before they reach this database.

insert into public.studio_permissions (key, label, description, group_name, sort_order)
values
  ('email.read', 'Access email workspace', 'Read and organize the connected Gmail mailbox.', 'Workspace', 15),
  ('email.manage', 'Manage email workspace', 'Connect the Gmail account and send or manage messages.', 'Workspace', 16)
on conflict (key) do update
set label = excluded.label,
    description = excluded.description,
    group_name = excluded.group_name,
    sort_order = excluded.sort_order;

insert into public.studio_role_permissions (role, permission_key, allowed)
values ('admin', 'email.read', true), ('admin', 'email.manage', true)
on conflict (role, permission_key) do update
set allowed = excluded.allowed, updated_at = now();

create table if not exists public.studio_gmail_connections (
  connection_id text primary key check (connection_id = 'workspace'),
  email_address text not null,
  encrypted_refresh_token text not null,
  connected_by uuid not null references auth.users(id) on delete restrict,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.studio_gmail_connections enable row level security;
revoke all on public.studio_gmail_connections from anon, authenticated;
grant select, insert, update, delete on public.studio_gmail_connections to service_role;

create table if not exists public.studio_gmail_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in (
    'connect', 'disconnect', 'list', 'read', 'modify', 'draft', 'send', 'attachment'
  )),
  outcome text not null check (outcome in ('started', 'succeeded', 'failed', 'unknown')),
  gmail_message_id text,
  idempotency_key uuid,
  detail_code text,
  created_at timestamptz not null default now()
);

create index if not exists studio_gmail_audit_events_created_idx
  on public.studio_gmail_audit_events(created_at desc);
create index if not exists studio_gmail_audit_events_actor_created_idx
  on public.studio_gmail_audit_events(actor_id, created_at desc);

alter table public.studio_gmail_audit_events enable row level security;
revoke all on public.studio_gmail_audit_events from anon, authenticated;
grant select, insert on public.studio_gmail_audit_events to authenticated;

drop policy if exists "Gmail audit admin read" on public.studio_gmail_audit_events;
create policy "Gmail audit admin read"
  on public.studio_gmail_audit_events for select to authenticated
  using (public.is_studio_admin());

drop policy if exists "Gmail audit admin insert" on public.studio_gmail_audit_events;
create policy "Gmail audit admin insert"
  on public.studio_gmail_audit_events for insert to authenticated
  with check (public.is_studio_admin() and actor_id = (select auth.uid()));

create table if not exists public.studio_gmail_sends (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  status text not null check (status in ('started', 'sent', 'failed', 'unknown')),
  gmail_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (actor_id, idempotency_key)
);

alter table public.studio_gmail_sends enable row level security;
revoke all on public.studio_gmail_sends from anon, authenticated;
grant select, insert, update on public.studio_gmail_sends to service_role;

create table if not exists public.studio_gmail_rate_limits (
  actor_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('send', 'read', 'list', 'modify', 'draft', 'connect', 'attachment')),
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (actor_id, action, window_start)
);

alter table public.studio_gmail_rate_limits enable row level security;
revoke all on public.studio_gmail_rate_limits from anon, authenticated;

create or replace function public.studio_gmail_consume_rate_limit(
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_window timestamptz;
  v_count integer;
begin
  if v_actor is null or not public.is_studio_admin()
     or p_action not in ('send', 'read', 'list', 'modify', 'draft', 'connect', 'attachment')
     or p_limit < 1 or p_window_seconds < 1 then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.studio_gmail_rate_limits (actor_id, action, window_start, request_count)
  values (v_actor, p_action, v_window, 1)
  on conflict (actor_id, action, window_start) do update
    set request_count = public.studio_gmail_rate_limits.request_count + 1
    where public.studio_gmail_rate_limits.request_count < p_limit
  returning request_count into v_count;

  return v_count is not null;
end;
$$;

revoke all on function public.studio_gmail_consume_rate_limit(text, integer, integer) from public;
grant execute on function public.studio_gmail_consume_rate_limit(text, integer, integer) to authenticated;
