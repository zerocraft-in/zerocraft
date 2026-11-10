-- Runtime dependencies used by the Studio settings and media screens.
-- Kept separate so an existing Studio deployment can apply this safely.

create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null default 'staff',
  invited_by uuid references public.accounts(id) on delete set null,
  status text not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz
);

create table if not exists public.files (
  storage_path text primary key,
  public_url text not null default '',
  file_name text not null,
  folder text not null default 'general',
  alt_text text not null default '',
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  created_by uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.staff_invites enable row level security;
alter table public.files enable row level security;

drop policy if exists "Managers read invites" on public.staff_invites;
drop policy if exists "Managers manage invites" on public.staff_invites;
drop policy if exists "Members read files" on public.files;
drop policy if exists "Managers manage files" on public.files;

create policy "Managers read invites" on public.staff_invites
  for select to authenticated using (public.has_permission('team.manage'));
create policy "Managers manage invites" on public.staff_invites
  for all to authenticated using (public.has_permission('team.manage'))
  with check (public.has_permission('team.manage'));
create policy "Members read files" on public.files
  for select to authenticated using (public.has_permission('media.read') or public.has_permission('media.manage'));
create policy "Managers manage files" on public.files
  for all to authenticated using (public.has_permission('media.manage'))
  with check (public.has_permission('media.manage'));

grant select, insert, update, delete on public.staff_invites, public.files to authenticated;

create or replace function public.studio_integration_statuses()
returns table (
  provider text,
  display_name text,
  status text,
  enabled boolean,
  last_verified_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select i.provider, i.display_name, i.status, i.enabled, i.last_verified_at
  from public.integrations i
  where public.has_permission('integrations.manage')
  order by i.display_name;
$$;

revoke all on function public.studio_integration_statuses() from public, anon;
grant execute on function public.studio_integration_statuses() to authenticated;

notify pgrst, 'reload schema';
