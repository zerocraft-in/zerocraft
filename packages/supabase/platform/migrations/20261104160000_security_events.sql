create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (length(event_type) between 1 and 100),
  route text,
  method text,
  status_code integer,
  actor_id uuid references auth.users(id) on delete set null,
  ip_hash text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists security_events_created_idx on public.security_events(created_at desc);
create index if not exists security_events_type_idx on public.security_events(event_type, created_at desc);
create index if not exists security_events_status_idx on public.security_events(status_code, created_at desc);

alter table public.security_events enable row level security;
revoke all on public.security_events from public, anon, authenticated;
grant all on public.security_events to service_role;
