create table if not exists public.studio_saved_views (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  workspace text not null,
  resource text not null,
  name text not null,
  view_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, workspace, resource, name)
);

alter table public.studio_saved_views enable row level security;
create policy "Users manage own saved views" on public.studio_saved_views
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create index if not exists studio_saved_views_owner_resource_idx
  on public.studio_saved_views(owner_id, workspace, resource, updated_at desc);
