-- Configurable reliability thresholds for proactive SLA monitoring.

create table if not exists public.studio_system_health_sla_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  uptime_target numeric(5,2) not null default 99.00 check (uptime_target between 0 and 100),
  failure_rate_max numeric(5,2) not null default 5.00 check (failure_rate_max between 0 and 100),
  mttr_max_minutes integer not null default 60 check (mttr_max_minutes >= 0),
  notify_admins boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.studio_system_health_sla_settings (id) values (true) on conflict (id) do nothing;
alter table public.studio_system_health_sla_settings enable row level security;
drop policy if exists "Studio read health SLA settings" on public.studio_system_health_sla_settings;
create policy "Studio read health SLA settings" on public.studio_system_health_sla_settings for select to authenticated
  using (public.studio_has_permission('system_health.read'));
drop policy if exists "Studio manage health SLA settings" on public.studio_system_health_sla_settings;
create policy "Studio manage health SLA settings" on public.studio_system_health_sla_settings for all to authenticated
  using (public.studio_has_permission('system_health.manage'))
  with check (public.studio_has_permission('system_health.manage'));
grant select, insert, update on public.studio_system_health_sla_settings to authenticated;
grant all on public.studio_system_health_sla_settings to service_role;
