-- Secure team invitations and access suspension metadata.
alter table public.profiles
  add column if not exists is_active boolean not null default true;

create or replace function public.is_studio_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and is_active and role in ('admin', 'manager', 'staff'));
$$;

create or replace function public.is_studio_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and is_active and role = 'admin');
$$;

create table if not exists public.studio_team_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role public.user_role not null default 'staff'::public.user_role,
  auth_user_id uuid references auth.users(id) on delete set null,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired', 'email_failed')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz
);

create index if not exists studio_team_invites_email_idx on public.studio_team_invites (lower(email));
create index if not exists studio_team_invites_status_idx on public.studio_team_invites (status, created_at desc);
create unique index if not exists studio_team_invites_pending_email_idx
  on public.studio_team_invites (lower(email)) where status = 'pending';

alter table public.studio_team_invites enable row level security;

drop policy if exists "Studio admins read team invites" on public.studio_team_invites;
create policy "Studio admins read team invites" on public.studio_team_invites for select to authenticated
  using (public.is_studio_admin());

revoke all on public.studio_team_invites from anon, authenticated;
grant select on public.studio_team_invites to authenticated;
grant update (role, is_active, full_name, phone, avatar_url, updated_at) on public.profiles to authenticated;
