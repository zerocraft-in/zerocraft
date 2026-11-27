-- Studio session and device registry for the authenticated CMS workspace.

create table if not exists public.studio_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_label text not null default 'Unknown device',
  device_type text not null default 'desktop' check (device_type in ('desktop', 'mobile', 'tablet', 'unknown')),
  browser text not null default 'Unknown browser',
  operating_system text not null default 'Unknown OS',
  user_agent text not null default '',
  ip_address text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_sessions_user_last_seen_idx on public.studio_sessions(user_id, last_seen_at desc);
create index if not exists studio_sessions_active_idx on public.studio_sessions(user_id, revoked_at) where revoked_at is null;

alter table public.studio_sessions enable row level security;
revoke all on public.studio_sessions from public, anon, authenticated;

comment on table public.studio_sessions is 'Server-managed CMS browser sessions and device metadata.';
