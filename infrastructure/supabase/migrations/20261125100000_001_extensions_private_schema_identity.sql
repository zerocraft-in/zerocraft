
-- ============================================================================
-- Zerocraft Platform — Migration 001
-- Extensions, private schema, security helpers, and identity tables.
--
-- Target: Zerocraft Platform database ONLY.
-- Additive. Creates no customer or commerce objects.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extensions
-- ----------------------------------------------------------------------------

create extension if not exists "pgcrypto";
create extension if not exists "citext";


-- ----------------------------------------------------------------------------
-- 2. Schema: private
--
-- Security-critical helper functions live here.
-- USAGE is granted to authenticated so public wrapper functions can delegate
-- to private SECURITY DEFINER functions.
-- EXECUTE on individual private functions remains restricted.
-- ----------------------------------------------------------------------------

create schema if not exists private;

grant usage on schema private to authenticated;
revoke all on schema private from public, anon;


-- ----------------------------------------------------------------------------
-- 3. Trigger helper: updated_at()
-- ----------------------------------------------------------------------------

create or replace function public.updated_at_trigger()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.updated_at_trigger() from public, anon;


-- ----------------------------------------------------------------------------
-- 4. Platform-level helpers
--
-- These helpers depend on tables created in migration 002.
-- PL/pgSQL resolves referenced relations when the function executes.
-- Therefore, defining these helpers before migration 002 is safe.
-- ----------------------------------------------------------------------------

-- Returns the authenticated user's ID, or NULL when unauthenticated.
create or replace function private.auth_user_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid();
$$;

revoke all on function private.auth_user_id() from public, anon;
grant execute on function private.auth_user_id() to authenticated;


-- Returns the active platform_members.id for the authenticated user.
-- Depends on platform_members (migration 002).
create or replace function private.platform_member_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
begin
  select pm.id
  into v_member_id
  from public.platform_members pm
  where pm.user_id = auth.uid()
    and pm.status = 'active';

  return v_member_id;
end;
$$;

revoke all on function private.platform_member_id() from public, anon;
grant execute on function private.platform_member_id() to authenticated;


-- Returns whether the authenticated platform member has a permission.
-- Depends on platform_members, platform_role_permissions,
-- and platform_permissions (migration 002).
create or replace function private.has_platform_permission(
  p_permission text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  select count(*)
  into v_count
  from public.platform_members pm
  join public.platform_role_permissions prp
    on prp.role_id = pm.role_id
  join public.platform_permissions pp
    on pp.key = prp.permission_key
  where pm.user_id = auth.uid()
    and pm.status = 'active'
    and pp.key = p_permission;

  return v_count > 0;
end;
$$;

revoke all on function private.has_platform_permission(text)
  from public, anon;

grant execute on function private.has_platform_permission(text)
  to authenticated;


-- Pin ownership to postgres so this SECURITY DEFINER helper bypasses
-- platform_members RLS and avoids recursive policy evaluation.
do $$
begin
  execute
    'alter function private.has_platform_permission(text) owner to postgres';
exception
  when insufficient_privilege then
    raise exception
      'FATAL: could not set owner of private.has_platform_permission(text) to postgres. Aborting migration. Run it as a role with membership in postgres.';
end;
$$;


-- Returns whether the authenticated user is a Platform Owner.
create or replace function private.is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_platform_permission('platform.admin');
$$;

revoke all on function private.is_platform_owner() from public, anon;
grant execute on function private.is_platform_owner() to authenticated;


-- ----------------------------------------------------------------------------
-- 5. Identity: platform_users
--
-- One row per auth.users row.
-- Supabase Auth remains the identity provider.
-- Credentials are never duplicated here.
-- Email is stored in auth.users as the source of truth.
-- ----------------------------------------------------------------------------

create table public.platform_users (
  id uuid not null
    constraint pk_platform_users primary key
    references auth.users(id)
    on delete cascade,

  full_name text null,
  phone text null,
  avatar_path text null,
  email citext null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.platform_users is
  'One row per Supabase Auth user. Platform identity. Email lives in auth.users only.';

alter table public.platform_users enable row level security;


-- Users can read their own platform profile.
create policy "platform_users_select_own"
on public.platform_users
for select
to authenticated
using (id = auth.uid());


-- Users can update only their own platform profile.
create policy "platform_users_update_own"
on public.platform_users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());


create trigger trg_platform_users_updated_at
before update on public.platform_users
for each row
execute function public.updated_at_trigger();


-- ----------------------------------------------------------------------------
-- 6. Identity: user_preferences
-- ----------------------------------------------------------------------------

create table public.user_preferences (
  id uuid not null default gen_random_uuid()
    constraint pk_user_preferences primary key,

  user_id uuid not null
    constraint fk_user_preferences_user_id
    references public.platform_users(id)
    on delete cascade,

  theme text not null default 'system'
    constraint ck_user_preferences_theme
    check (theme in ('light', 'dark', 'system')),

  language text not null default 'en'
    constraint ck_user_preferences_language
    check (char_length(language) between 2 and 8),

  email_notifications boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_user_preferences_user_id unique (user_id)
);

comment on table public.user_preferences is
  'Per-user platform preferences.';

create index idx_user_preferences_user_id
  on public.user_preferences(user_id);

alter table public.user_preferences enable row level security;


-- Users can read their own preferences.
create policy "user_preferences_select_own"
on public.user_preferences
for select
to authenticated
using (
  user_id = (
    select id
    from public.platform_users
    where id = auth.uid()
  )
);


-- Users can insert preferences only for their own account.
create policy "user_preferences_insert_own"
on public.user_preferences
for insert
to authenticated
with check (
  user_id = (
    select id
    from public.platform_users
    where id = auth.uid()
  )
);


-- Users can update only their own preferences.
create policy "user_preferences_update_own"
on public.user_preferences
for update
to authenticated
using (
  user_id = (
    select id
    from public.platform_users
    where id = auth.uid()
  )
)
with check (
  user_id = (
    select id
    from public.platform_users
    where id = auth.uid()
  )
);


create trigger trg_user_preferences_updated_at
before update on public.user_preferences
for each row
execute function public.updated_at_trigger();


-- ============================================================================
-- Migration 001 complete.
-- ============================================================================
