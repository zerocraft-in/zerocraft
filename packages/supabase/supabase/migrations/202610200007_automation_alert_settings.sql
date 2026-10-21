-- Admin-controlled delivery preferences for automation failure alerts.

create table if not exists public.studio_automation_settings (
  job_name text primary key,
  enabled boolean not null default true,
  email_alerts_enabled boolean not null default true,
  recipient_roles text[] not null default array['admin', 'manager']::text[],
  cooldown_minutes integer not null default 60 check (cooldown_minutes between 5 and 10080),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.studio_automation_settings (job_name)
values ('studio-low-stock-alerts')
on conflict (job_name) do nothing;

alter table public.studio_automation_settings enable row level security;
drop policy if exists "Studio read automation settings" on public.studio_automation_settings;
create policy "Studio read automation settings"
  on public.studio_automation_settings for select to authenticated
  using (public.is_studio_member());
drop policy if exists "Studio admins manage automation settings" on public.studio_automation_settings;
create policy "Studio admins manage automation settings"
  on public.studio_automation_settings for all to authenticated
  using (public.is_studio_admin())
  with check (public.is_studio_admin());
grant select, insert, update on public.studio_automation_settings to authenticated;
