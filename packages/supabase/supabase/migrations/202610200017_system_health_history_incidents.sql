-- Durable system-health history and incident tracking.

create table if not exists public.studio_system_health_runs (
  id uuid primary key default gen_random_uuid(),
  overall text not null check (overall in ('healthy', 'degraded', 'critical')),
  checks jsonb not null default '[]'::jsonb check (jsonb_typeof(checks) = 'array'),
  summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary) = 'object'),
  trigger text not null default 'dashboard' check (trigger in ('dashboard', 'diagnostic', 'scheduled')),
  triggered_by uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists studio_system_health_runs_created_idx on public.studio_system_health_runs(created_at desc);
create index if not exists studio_system_health_runs_overall_idx on public.studio_system_health_runs(overall, created_at desc);

create table if not exists public.studio_system_health_incidents (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  status text not null default 'open' check (status in ('open', 'resolved')),
  severity text not null check (severity in ('degraded', 'critical')),
  component text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  latest_message text not null default '',
  notification_sent_at timestamptz,
  notification_attempts integer not null default 0 check (notification_attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_system_health_incidents_status_idx on public.studio_system_health_incidents(status, last_seen_at desc);
create index if not exists studio_system_health_incidents_severity_idx on public.studio_system_health_incidents(severity, created_at desc);

alter table public.studio_system_health_runs enable row level security;
alter table public.studio_system_health_incidents enable row level security;

drop policy if exists "Studio read system health runs" on public.studio_system_health_runs;
create policy "Studio read system health runs" on public.studio_system_health_runs for select to authenticated
  using (public.is_studio_member());

drop policy if exists "Studio read system health incidents" on public.studio_system_health_incidents;
create policy "Studio read system health incidents" on public.studio_system_health_incidents for select to authenticated
  using (public.is_studio_member());

grant select on public.studio_system_health_runs, public.studio_system_health_incidents to authenticated;
grant all on public.studio_system_health_runs, public.studio_system_health_incidents to service_role;
