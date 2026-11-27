-- Acknowledgement state for operational failures shown in System Health.

create table if not exists public.studio_system_health_failure_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  failure_type text not null check (failure_type in ('automation', 'email')),
  failure_id uuid not null,
  status text not null default 'acknowledged' check (status in ('acknowledged', 'resolved')),
  notes text,
  acknowledged_by uuid references auth.users(id) on delete set null,
  resolved_by uuid references auth.users(id) on delete set null,
  acknowledged_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (failure_type, failure_id)
);

create index if not exists studio_health_failure_ack_status_idx
  on public.studio_system_health_failure_acknowledgements(status, updated_at desc);

alter table public.studio_system_health_failure_acknowledgements enable row level security;
drop policy if exists "Studio read health failure acknowledgements" on public.studio_system_health_failure_acknowledgements;
create policy "Studio read health failure acknowledgements"
  on public.studio_system_health_failure_acknowledgements for select to authenticated
  using (public.studio_has_permission('system_health.read'));
drop policy if exists "Studio manage health failure acknowledgements" on public.studio_system_health_failure_acknowledgements;
create policy "Studio manage health failure acknowledgements"
  on public.studio_system_health_failure_acknowledgements for all to authenticated
  using (public.studio_has_permission('system_health.manage'))
  with check (public.studio_has_permission('system_health.manage'));

grant select, insert, update on public.studio_system_health_failure_acknowledgements to authenticated;
grant all on public.studio_system_health_failure_acknowledgements to service_role;
