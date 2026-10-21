-- Per-user notification preferences. Users can update only their own settings.

create table if not exists public.studio_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  automation_failure_enabled boolean not null default true,
  low_stock_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.studio_notification_preferences enable row level security;
drop policy if exists "Studio read notification preferences" on public.studio_notification_preferences;
create policy "Studio read notification preferences"
  on public.studio_notification_preferences for select to authenticated
  using (public.is_studio_member());
drop policy if exists "Users manage own notification preferences" on public.studio_notification_preferences;
create policy "Users manage own notification preferences"
  on public.studio_notification_preferences for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update on public.studio_notification_preferences to authenticated;
