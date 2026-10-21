-- CMS observability, notification and low-stock foundations.
-- Additive migration. Existing records are preserved.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  category text not null default 'system',
  type text not null default 'info' check (type in ('info', 'success', 'warning', 'error')),
  read boolean not null default false,
  link text,
  recipient_id uuid references auth.users(id) on delete cascade,
  dedupe_key text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

alter table public.notifications add column if not exists recipient_id uuid references auth.users(id) on delete cascade;
alter table public.notifications add column if not exists dedupe_key text;
alter table public.notifications add column if not exists metadata jsonb not null default '{}'::jsonb;
create unique index if not exists notifications_dedupe_key_idx
  on public.notifications(dedupe_key) where dedupe_key is not null;
create index if not exists notifications_created_at_idx
  on public.notifications(created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications(read, created_at desc);

alter table public.notifications enable row level security;
drop policy if exists "Studio manage notifications" on public.notifications;
create policy "Studio manage notifications"
  on public.notifications for all to authenticated
  using (public.is_studio_member())
  with check (public.is_studio_member());
grant select, insert, update, delete on public.notifications to authenticated;

create table if not exists public.studio_email_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'smtp',
  kind text not null,
  recipient text not null,
  subject text not null default '',
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'dead_letter')),
  attempts integer not null default 0 check (attempts >= 0),
  message_id text,
  last_error text,
  next_attempt_at timestamptz,
  sent_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_email_events_status_idx
  on public.studio_email_events(status, next_attempt_at, created_at desc);
create index if not exists studio_email_events_recipient_idx
  on public.studio_email_events(recipient, created_at desc);
alter table public.studio_email_events enable row level security;
drop policy if exists "Studio read email events" on public.studio_email_events;
create policy "Studio read email events"
  on public.studio_email_events for select to authenticated
  using (public.is_studio_member());
drop policy if exists "Studio create email events" on public.studio_email_events;
create policy "Studio create email events"
  on public.studio_email_events for insert to authenticated
  with check (public.is_studio_member() and created_by = (select auth.uid()));
drop policy if exists "Studio update email events" on public.studio_email_events;
create policy "Studio update email events"
  on public.studio_email_events for update to authenticated
  using (public.is_studio_member())
  with check (public.is_studio_member());
grant select, insert, update on public.studio_email_events to authenticated;

create table if not exists public.studio_low_stock_alerts (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.store_inventory_locations(id) on delete cascade,
  variant_id uuid not null references public.store_product_variants(id) on delete cascade,
  last_on_hand integer not null default 0,
  last_reserved integer not null default 0,
  last_reorder_point integer not null default 0,
  status text not null default 'active' check (status in ('active', 'resolved')),
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (location_id, variant_id)
);

create index if not exists studio_low_stock_alerts_status_idx
  on public.studio_low_stock_alerts(status, last_detected_at desc);
alter table public.studio_low_stock_alerts enable row level security;
drop policy if exists "Studio manage low stock alerts" on public.studio_low_stock_alerts;
create policy "Studio manage low stock alerts"
  on public.studio_low_stock_alerts for all to authenticated
  using (public.is_studio_member())
  with check (public.is_studio_member());
grant select, insert, update on public.studio_low_stock_alerts to authenticated;
