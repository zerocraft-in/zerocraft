-- ============================================================================
-- Zerocraft Commerce Template — 002_identity_and_access
-- Tenant members, roles, permissions and secure identity resolution.
--
-- This is NOT a second authentication system. Supabase Auth remains the
-- identity provider. Zerocraft central identities are mapped into
-- tenant_members.central_user_id after a verified platform assertion.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Tenant-local RBAC
-- ----------------------------------------------------------------------------
create table if not exists public.roles (
  id uuid not null default gen_random_uuid() primary key,
  key text not null unique,
  name text not null,
  description text null,
  rank integer not null check (rank >= 0),
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.roles is 'Tenant-local role catalogue. Owner has the highest rank.';
comment on column public.roles.rank is 'Used to prevent privilege escalation; higher is more privileged.';

create table if not exists public.permissions (
  key text not null primary key,
  "group" text not null,
  description text null,
  created_at timestamptz not null default now()
);

comment on table public.permissions is 'Permission catalogue. Application code checks keys, never role names.';

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (role_id, permission_key)
);

drop trigger if exists roles_set_updated_at on public.roles;
create trigger roles_set_updated_at
  before update on public.roles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Tenant members
--
-- local_user_id: a user in this customer project's Supabase Auth.
-- central_user_id: a Zerocraft Platform Auth user id propagated by a verified
--                  platform assertion JWT.
-- At least one mapping must be present. Both may be present once an invited
-- platform user has signed in locally.
-- ----------------------------------------------------------------------------
create table if not exists public.tenant_members (
  id uuid not null default gen_random_uuid() primary key,
  central_user_id uuid null,
  local_user_id uuid null references auth.users(id) on delete cascade,
  email citext null,
  display_name text null,
  role_id uuid not null references public.roles(id) on delete restrict,
  status text not null default 'active'
    check (status in ('invited', 'active', 'suspended', 'removed')),
  all_stores boolean not null default true,
  invited_by_central_user_id uuid null,
  invited_at timestamptz null,
  joined_at timestamptz null,
  last_seen_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_members_identity_present
    check (central_user_id is not null or local_user_id is not null),
  constraint tenant_members_id_store_key unique (id)
);

create unique index if not exists tenant_members_central_user_key
  on public.tenant_members(central_user_id) where central_user_id is not null;
create unique index if not exists tenant_members_local_user_key
  on public.tenant_members(local_user_id) where local_user_id is not null;
create unique index if not exists tenant_members_email_key
  on public.tenant_members(lower(email)) where email is not null;
create index if not exists tenant_members_role_idx on public.tenant_members(role_id);
create index if not exists tenant_members_status_idx on public.tenant_members(status);

create table if not exists public.tenant_member_stores (
  member_id uuid not null references public.tenant_members(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, store_id)
);

drop trigger if exists tenant_members_set_updated_at on public.tenant_members;
create trigger tenant_members_set_updated_at
  before update on public.tenant_members
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Identity resolution helpers
-- ----------------------------------------------------------------------------
create or replace function private.tenant_claims()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select private.jwt_claims();
$$;

revoke all on function private.tenant_claims() from public, anon;
grant execute on function private.tenant_claims() to authenticated, service_role;

create or replace function private.platform_claim_is_trusted()
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_ctx public.tenant_context;
  v_claims jsonb;
  v_iss text;
  v_aud jsonb;
begin
  select * into v_ctx from public.tenant_context where id = 1;
  if not found or v_ctx.platform_issuer is null then
    return false;
  end if;

  v_claims := private.jwt_claims();
  v_iss := v_claims ->> 'iss';
  v_aud := v_claims -> 'aud';

  if v_iss is distinct from v_ctx.platform_issuer then
    return false;
  end if;

  if v_ctx.platform_audience is not null then
    if v_aud is null then
      return false;
    end if;
    if jsonb_typeof(v_aud) = 'array' then
      if not (v_aud ? v_ctx.platform_audience) then
        return false;
      end if;
    elsif (v_aud #>> '{}') is distinct from v_ctx.platform_audience then
      return false;
    end if;
  end if;

  return true;
end;
$$;

revoke all on function private.platform_claim_is_trusted() from public, anon;
grant execute on function private.platform_claim_is_trusted() to authenticated, service_role;

create or replace function private.current_member_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_central uuid;
  v_member_id uuid;
begin
  -- 1. Customer-project Supabase Auth identity.
  begin
    v_uid := auth.uid();
  exception when others then
    v_uid := null;
  end;

  if v_uid is not null then
    select m.id into v_member_id
    from public.tenant_members m
    where m.local_user_id = v_uid and m.status = 'active'
    limit 1;

    if v_member_id is not null then
      return v_member_id;
    end if;
  end if;

  -- 2. Verified Zerocraft platform assertion.
  if not private.platform_claim_is_trusted() then
    return null;
  end if;

  begin
    v_central := nullif(private.jwt_claims() ->> 'sub', '')::uuid;
  exception when others then
    v_central := null;
  end;

  if v_central is null then
    return null;
  end if;

  select m.id into v_member_id
  from public.tenant_members m
  where m.central_user_id = v_central and m.status = 'active'
  limit 1;

  return v_member_id;
end;
$$;

revoke all on function private.current_member_id() from public, anon;
grant execute on function private.current_member_id() to authenticated, service_role;

create or replace function private.current_tenant_member()
returns public.tenant_members
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.tenant_members
  where id = private.current_member_id();
$$;

revoke all on function private.current_tenant_member() from public, anon;
grant execute on function private.current_tenant_member() to authenticated, service_role;

create or replace function private.is_tenant_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_member_id() is not null;
$$;

revoke all on function private.is_tenant_member() from public, anon;
grant execute on function private.is_tenant_member() to authenticated, service_role;

create or replace function private.has_tenant_permission(p_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_member public.tenant_members;
begin
  select * into v_member from public.tenant_members
  where id = private.current_member_id() and status = 'active';

  if not found then
    return false;
  end if;

  return exists (
    select 1
    from public.role_permissions rp
    where rp.role_id = v_member.role_id
      and rp.permission_key = p_permission
  );
end;
$$;

revoke all on function private.has_tenant_permission(text) from public, anon;
grant execute on function private.has_tenant_permission(text) to authenticated, service_role;

create or replace function private.current_store_ids()
returns setof uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_member public.tenant_members;
begin
  select * into v_member from public.tenant_members
  where id = private.current_member_id() and status = 'active';

  if not found then
    return;
  end if;

  if v_member.all_stores then
    return query select s.id from public.stores s where s.status = 'active';
    return;
  end if;

  return query
    select ms.store_id
    from public.tenant_member_stores ms
    join public.stores s on s.id = ms.store_id
    where ms.member_id = v_member.id and s.status = 'active';
end;
$$;

revoke all on function private.current_store_ids() from public, anon;
grant execute on function private.current_store_ids() to authenticated, service_role;

create or replace function private.can_access_store(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_store_id in (select private.current_store_ids());
$$;

revoke all on function private.can_access_store(uuid) from public, anon;
grant execute on function private.can_access_store(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Tenant bootstrap
--
-- Called exactly once by the provisioning Worker after seeds are installed.
-- Service-role only. Values are passed as parameters, never interpolated by
-- the Worker into SQL.
-- ----------------------------------------------------------------------------
create or replace function public.initialize_tenant(
  p_organization_id uuid,
  p_organization_name text,
  p_central_store_id uuid,
  p_store_name text,
  p_store_slug text,
  p_currency char(3),
  p_timezone text,
  p_owner_central_user_id uuid,
  p_owner_email text,
  p_owner_display_name text,
  p_taxonomy_version text,
  p_taxonomy_roots jsonb,
  p_template_version text,
  p_platform_issuer text default null,
  p_platform_audience text default null,
  p_platform_jwks_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_owner_role_id uuid;
  v_context_exists boolean;
  v_root jsonb;
begin
  if p_organization_id is null or p_central_store_id is null then
    raise exception 'organization_id and central_store_id are required';
  end if;

  if p_store_slug !~ '^[a-z0-9-]+$' then
    raise exception 'store slug must match ^[a-z0-9-]+$';
  end if;

  select exists(select 1 from public.tenant_context where id = 1)
    into v_context_exists;

  if v_context_exists then
    raise exception 'tenant is already initialized';
  end if;

  if not exists (select 1 from public.roles where key = 'owner') then
    raise exception 'default roles must be seeded before initialize_tenant';
  end if;

  select id into v_owner_role_id from public.roles where key = 'owner';

  insert into public.stores
    (central_store_ref, name, slug, currency, timezone, is_default)
  values
    (p_central_store_id, p_store_name, p_store_slug, p_currency, p_timezone, true)
  returning id into v_store_id;

  insert into public.tenant_context
    (id, organization_id, organization_name, central_store_id, store_id,
     template_version, taxonomy_version, platform_issuer, platform_audience,
     platform_jwks_url, local_auth_enabled, initialized_at)
  values
    (1, p_organization_id, p_organization_name, p_central_store_id, v_store_id,
     p_template_version, p_taxonomy_version, p_platform_issuer, p_platform_audience,
     p_platform_jwks_url, true, now());

  insert into public.tenant_members
    (central_user_id, email, display_name, role_id, status, all_stores, joined_at)
  values
    (p_owner_central_user_id, p_owner_email::citext, p_owner_display_name,
     v_owner_role_id, 'active', true, now())
  on conflict do nothing;

  if p_taxonomy_version is not null and p_taxonomy_roots is not null then
    for v_root in select value from jsonb_array_elements(p_taxonomy_roots)
    loop
      insert into public.taxonomy_root_selections
        (version, category_gid, name, position, enabled)
      values
        (p_taxonomy_version,
         v_root ->> 'id',
         coalesce(v_root ->> 'name', v_root ->> 'id'),
         coalesce((v_root ->> 'position')::integer, 0),
         true)
      on conflict (version, category_gid) do update
        set name = excluded.name,
            position = excluded.position,
            enabled = true;
    end loop;
  end if;

  -- Seed functions are installed from /seeds before initialize_tenant is
  -- called. They are idempotent and service-role only.
  perform public.seed_tenant_defaults(v_store_id);
  perform public.seed_tenant_channels(v_store_id);

  return v_store_id;
end;
$$;

revoke all on function public.initialize_tenant(
  uuid, text, uuid, text, text, char, text, uuid, text, text, text, jsonb, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.initialize_tenant(
  uuid, text, uuid, text, text, char, text, uuid, text, text, text, jsonb, text, text, text, text
) to service_role;

-- ----------------------------------------------------------------------------
-- JSON entry point for the provisioning Worker.
--
-- The Management API executes SQL text, so parameters cannot be bound. The
-- Worker sends one JSON document and this function casts each field with an
-- explicit type. Never interpolate individual values into SQL.
-- ----------------------------------------------------------------------------
create or replace function public.initialize_tenant_from_json(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'payload must be a JSON object';
  end if;

  return public.initialize_tenant(
    (p_payload ->> 'organization_id')::uuid,
    p_payload ->> 'organization_name',
    (p_payload ->> 'central_store_id')::uuid,
    p_payload ->> 'store_name',
    p_payload ->> 'store_slug',
    (p_payload ->> 'currency')::char(3),
    p_payload ->> 'timezone',
    (p_payload ->> 'owner_central_user_id')::uuid,
    p_payload ->> 'owner_email',
    p_payload ->> 'owner_display_name',
    p_payload ->> 'taxonomy_version',
    p_payload -> 'taxonomy_roots',
    p_payload ->> 'template_version',
    p_payload ->> 'platform_issuer',
    p_payload ->> 'platform_audience',
    p_payload ->> 'platform_jwks_url'
  );
end;
$$;

revoke all on function public.initialize_tenant_from_json(jsonb)
  from public, anon, authenticated;
grant execute on function public.initialize_tenant_from_json(jsonb) to service_role;

-- ----------------------------------------------------------------------------
-- Tenant settings
-- ----------------------------------------------------------------------------
create table if not exists public.tenant_settings (
  store_id uuid not null primary key references public.stores(id) on delete cascade,
  currency char(3) not null default 'INR',
  timezone text not null default 'Asia/Kolkata',
  tax_inclusive_pricing boolean not null default false,
  invoice_prefix text not null default 'INV-',
  invoice_next_number integer not null default 1 check (invoice_next_number > 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists tenant_settings_set_updated_at on public.tenant_settings;
create trigger tenant_settings_set_updated_at
  before update on public.tenant_settings
  for each row execute function public.set_updated_at();

-- RLS and grants are created in 015.

commit;
