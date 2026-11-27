
-- ============================================================================
-- Zerocraft Platform — Migration 005
-- Platform Owner bootstrap mechanism.
--
-- Target: Zerocraft Platform database ONLY.
-- Additive migration. No customer or commerce objects.
--
-- Creates:
--   1. public.platform_bootstrap_events
--   2. private.bootstrap_platform_owner(p_user_id uuid)
--
-- Security:
--   * SECURITY DEFINER
--   * Function owner: postgres
--   * search_path = ''
--   * EXECUTE granted only to service_role
--   * Not exposed through PostgREST
--   * One-time bootstrap enforced with advisory transaction lock
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Platform bootstrap audit events
-- ----------------------------------------------------------------------------

create table public.platform_bootstrap_events (
  id uuid not null default gen_random_uuid()
    constraint pk_platform_bootstrap_events primary key,

  bootstrapped_user_id uuid not null
    constraint fk_platform_bootstrap_events_user_id
    references public.platform_users(id)
    on delete restrict,

  bootstrapped_at timestamptz not null default now(),

  action text not null default 'platform_owner_bootstrap'
    constraint ck_platform_bootstrap_events_action
    check (char_length(action) between 1 and 100),

  metadata jsonb not null default '{}'::jsonb
    constraint ck_platform_bootstrap_events_metadata
    check (jsonb_typeof(metadata) = 'object'),

  created_at timestamptz not null default now()
);

comment on table public.platform_bootstrap_events is
  'Append-only audit trail for Platform Owner bootstrap events.';

comment on column public.platform_bootstrap_events.bootstrapped_user_id is
  'Platform user who received the Platform Owner role.';

comment on column public.platform_bootstrap_events.bootstrapped_at is
  'Timestamp when the bootstrap operation occurred.';

comment on column public.platform_bootstrap_events.action is
  'Bootstrap action identifier.';

comment on column public.platform_bootstrap_events.metadata is
  'Non-sensitive structured metadata for the bootstrap event.';


-- Indexes
create index idx_platform_bootstrap_events_user_id
  on public.platform_bootstrap_events(bootstrapped_user_id);

create index idx_platform_bootstrap_events_created_at
  on public.platform_bootstrap_events(created_at desc);


-- RLS
alter table public.platform_bootstrap_events
  enable row level security;


-- Only platform administrators can read bootstrap history.
create policy "platform_bootstrap_events_select_admin"
on public.platform_bootstrap_events
for select
to authenticated
using (
  private.has_platform_permission('platform.admin')
);


-- Direct client writes are blocked.
create policy "platform_bootstrap_events_insert_blocked"
on public.platform_bootstrap_events
for insert
to authenticated
with check (false);

create policy "platform_bootstrap_events_update_blocked"
on public.platform_bootstrap_events
for update
to authenticated
using (false);

create policy "platform_bootstrap_events_delete_blocked"
on public.platform_bootstrap_events
for delete
to authenticated
using (false);


-- Explicit privileges.
revoke all on public.platform_bootstrap_events
from public, anon;

revoke insert, update, delete
on public.platform_bootstrap_events
from authenticated;

grant select
on public.platform_bootstrap_events
to authenticated;


-- ----------------------------------------------------------------------------
-- 2. Platform Owner bootstrap function
-- ----------------------------------------------------------------------------

create or replace function private.bootstrap_platform_owner(
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_role_id uuid;
  v_existing_owner uuid;
  v_lock_key bigint;
  v_event_id uuid;
begin

  -- 0. Validate input
  if p_user_id is null then
    raise exception 'Target user ID is required';
  end if;


  -- 1. Global advisory lock
  v_lock_key := pg_catalog.hashtext(
    'zerocraft-platform-bootstrap'
  )::bigint;

  perform pg_catalog.pg_advisory_xact_lock(v_lock_key);


  -- 2. Validate Supabase Auth user
  if not exists (
    select 1
    from auth.users
    where id = p_user_id
  ) then
    raise exception
      'Target user % does not exist in auth.users',
      p_user_id;
  end if;


  -- 3. Validate platform profile
  if not exists (
    select 1
    from public.platform_users
    where id = p_user_id
  ) then
    raise exception
      'Target user % has no platform_users profile',
      p_user_id;
  end if;


  -- 4. One-time bootstrap enforcement
  -- Refuse if ANY Platform Owner membership already exists.
  select pm.id
  into v_existing_owner
  from public.platform_members pm
  join public.platform_roles pr
    on pr.id = pm.role_id
  where pr.key = 'platform_owner'
  limit 1;

  if v_existing_owner is not null then
    raise exception
      'A Platform Owner membership already exists (member id %). Refusing to re-bootstrap.',
      v_existing_owner;
  end if;


  -- 5. Defense in depth
  -- Never overwrite an existing platform membership.
  if exists (
    select 1
    from public.platform_members
    where user_id = p_user_id
  ) then
    raise exception
      'Target user % already has a platform membership. Refusing to re-bootstrap.',
      p_user_id;
  end if;


  -- 6. Resolve system Platform Owner role
  select id
  into v_owner_role_id
  from public.platform_roles
  where key = 'platform_owner'
    and is_system = true;

  if v_owner_role_id is null then
    raise exception
      'platform_owner system role not found';
  end if;


  -- 7. Create Platform Owner membership
  insert into public.platform_members (
    user_id,
    role_id,
    status,
    joined_at,
    created_at,
    updated_at
  )
  values (
    p_user_id,
    v_owner_role_id,
    'active',
    now(),
    now(),
    now()
  );


  -- 8. Record audit event
  insert into public.platform_bootstrap_events (
    bootstrapped_user_id,
    action,
    metadata,
    bootstrapped_at,
    created_at
  )
  values (
    p_user_id,
    'platform_owner_bootstrap',
    pg_catalog.jsonb_build_object(
      'bootstrapped_user_id', p_user_id,
      'role', 'platform_owner'
    ),
    now(),
    now()
  )
  returning id into v_event_id;


  -- 9. Return audit event ID
  return v_event_id;

end;
$$;


-- ----------------------------------------------------------------------------
-- 3. Function permissions
-- ----------------------------------------------------------------------------

revoke all
on function private.bootstrap_platform_owner(uuid)
from public, anon, authenticated;

grant execute
on function private.bootstrap_platform_owner(uuid)
to service_role;

grant usage on schema private to service_role;


-- ----------------------------------------------------------------------------
-- 4. Pin SECURITY DEFINER ownership to postgres
-- ----------------------------------------------------------------------------

do $$
begin
  execute
    'alter function private.bootstrap_platform_owner(uuid) owner to postgres';

exception
  when insufficient_privilege then
    raise exception
      'FATAL: could not set owner of private.bootstrap_platform_owner(uuid) to postgres. Run migration with a role that can transfer ownership to postgres.';
end;
$$;


-- ----------------------------------------------------------------------------
-- 5. Final security assertions
-- ----------------------------------------------------------------------------

do $$
declare
  v_owner text;
  v_security_definer boolean;
  v_function_config text[];
begin

  select
    pg_catalog.pg_get_userbyid(p.proowner),
    p.prosecdef,
    p.proconfig
  into
    v_owner,
    v_security_definer,
    v_function_config
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'private'
    and p.proname = 'bootstrap_platform_owner'
    and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_user_id uuid';

  -- Verify function owner.
  if v_owner is distinct from 'postgres' then
    raise exception
      'Bootstrap function owner verification failed. Expected postgres, got %',
      v_owner;
  end if;

  -- Verify SECURITY DEFINER.
  if v_security_definer is distinct from true then
    raise exception
      'Bootstrap function must use SECURITY DEFINER';
  end if;

  -- Verify empty search_path using the actual configuration array.
  if v_function_config is null
     or not (
       'search_path=""' = any(v_function_config)
     ) then
    raise exception
      'Bootstrap function search_path verification failed: %',
      v_function_config;
  end if;

  -- Verify only service_role has explicit EXECUTE permission.
  if pg_catalog.has_function_privilege(
       'anon',
       'private.bootstrap_platform_owner(uuid)',
       'EXECUTE'
     )
     or pg_catalog.has_function_privilege(
       'authenticated',
       'private.bootstrap_platform_owner(uuid)',
       'EXECUTE'
     ) then
    raise exception
      'Bootstrap function must not be executable by anon or authenticated';
  end if;

  if not pg_catalog.has_function_privilege(
    'service_role',
    'private.bootstrap_platform_owner(uuid)',
    'EXECUTE'
  ) then
    raise exception
      'Bootstrap function EXECUTE permission missing for service_role';
  end if;

end;
$$;


-- ============================================================================
-- End of Migration 005
-- ============================================================================
