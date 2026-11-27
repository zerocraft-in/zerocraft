
-- ============================================================================
-- Zerocraft Platform — Migration 013
-- Tenant databases registry and upsert RPC for provisioning worker.
--
-- Dependencies:
--   Migration 007: stores, tenant_provisioning_jobs
--   Migration 008: enqueue_tenant_provisioning integrity
--   Migration 009-012: sales_channels schema
--
-- Security:
--   * RLS enabled on tenant_databases
--   * Direct DML blocked for authenticated; writes via SECURITY DEFINER RPC
--   * SELECT restricted to active organization members
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Tenant databases — registry of provisioned tenant projects
-- ----------------------------------------------------------------------------

create table public.tenant_databases (
  id uuid not null default gen_random_uuid()
    constraint pk_tenant_databases primary key,

  organization_id uuid not null
    constraint fk_tenant_databases_organization_id
    references public.organizations(id)
    on delete cascade,

  store_id uuid not null
    constraint fk_tenant_databases_store_id
    references public.stores(id)
    on delete cascade,

  supabase_project_ref text not null
    constraint ck_tenant_databases_project_ref
    check (char_length(trim(supabase_project_ref)) between 1 and 100),

  supabase_organization_slug text null
    constraint ck_tenant_databases_org_slug
    check (char_length(trim(supabase_organization_slug)) between 1 and 100),

  project_name text not null
    constraint ck_tenant_databases_project_name
    check (char_length(trim(project_name)) between 1 and 120),

  region text not null
    constraint ck_tenant_databases_region
    check (char_length(trim(region)) between 1 and 100),

  template_name text not null
    constraint ck_tenant_databases_template_name
    check (char_length(trim(template_name)) between 1 and 100),

  template_version text not null
    constraint ck_tenant_databases_template_version
    check (char_length(trim(template_version)) between 1 and 100),

  database_password_secret_ref text null
    constraint ck_tenant_databases_password_ref
    check (char_length(trim(database_password_secret_ref)) between 1 and 200),

  publishable_key text null
    constraint ck_tenant_databases_publishable_key
    check (char_length(trim(publishable_key)) between 1 and 500),

  lifecycle_status text not null default 'provisioning'
    constraint ck_tenant_databases_lifecycle_status
    check (lifecycle_status in ('provisioning', 'active', 'failed', 'archived')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_tenant_databases_store_id
    unique (store_id)
);

comment on table public.tenant_databases is
  'Registry of provisioned tenant databases. One row per store.';

comment on column public.tenant_databases.supabase_project_ref is
  'Supabase project reference (UUID).';

comment on column public.tenant_databases.database_password_secret_ref is
  'Reference to the encrypted database password secret. Never stores plaintext.';

alter table public.tenant_databases enable row level security;

create index idx_tenant_databases_organization_id
  on public.tenant_databases(organization_id);
create index idx_tenant_databases_store_id
  on public.tenant_databases(store_id);
create index idx_tenant_databases_lifecycle_status
  on public.tenant_databases(lifecycle_status);

-- Members of the organization can view their tenant databases.
create policy "tenant_databases_select_member"
on public.tenant_databases
for select
to authenticated
using (
  organization_id in (select private.current_org_ids())
);

-- Direct writes are blocked; tenant databases are created via secure RPC.
create policy "tenant_databases_insert_blocked"
on public.tenant_databases
for insert
to authenticated
with check (false);

create policy "tenant_databases_update_blocked"
on public.tenant_databases
for update
to authenticated
using (false);

create policy "tenant_databases_delete_blocked"
on public.tenant_databases
for delete
to authenticated
using (false);

create trigger trg_tenant_databases_updated_at
before update on public.tenant_databases
for each row
execute function public.updated_at_trigger();


-- ----------------------------------------------------------------------------
-- 2. RPC: private.upsert_tenant_database — upsert tenant database registry
-- ----------------------------------------------------------------------------

create or replace function private.upsert_tenant_database(
  p_organization_id uuid,
  p_store_id uuid,
  p_connection_id uuid,
  p_supabase_project_ref text,
  p_supabase_organization_slug text,
  p_project_name text,
  p_region text,
  p_template_name text,
  p_template_version text,
  p_project_url text,
  p_publishable_key text,
  p_health_status text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_database_id uuid;
  v_existing uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  -- Validate organization membership and stores.manage permission.
  if not private.has_org_permission(
    p_organization_id,
    'stores.manage'
  ) then
    raise exception 'Caller is not authorized to manage stores in this organization';
  end if;

  -- Validate store belongs to organization.
  if not exists (
    select 1
    from public.stores
    where id = p_store_id
      and organization_id = p_organization_id
  ) then
    raise exception 'Store not found or does not belong to this organization';
  end if;

  -- Validate connection belongs to organization (if provided).
  if p_connection_id is not null then
    if not exists (
      select 1
      from public.supabase_connections
      where id = p_connection_id
        and organization_id = p_organization_id
    ) then
      raise exception 'Connection does not belong to this organization';
    end if;
  end if;

  -- Idempotency: return existing database for this store.
  select id
  into v_existing
  from public.tenant_databases
  where store_id = p_store_id
  limit 1;

  if v_existing is not null then
    -- Update existing record.
    update public.tenant_databases
    set
      supabase_project_ref = p_supabase_project_ref,
      supabase_organization_slug = p_supabase_organization_slug,
      project_name = p_project_name,
      region = p_region,
      template_name = p_template_name,
      template_version = p_template_version,
      project_url = p_project_url,
      publishable_key = p_publishable_key,
      health_status = p_health_status,
      updated_at = now()
    where id = v_existing
    returning id into v_database_id;

    return v_database_id;
  end if;

  -- Insert new tenant database record.
  insert into public.tenant_databases (
    organization_id,
    store_id,
    connection_id,
    supabase_project_ref,
    supabase_organization_slug,
    project_name,
    region,
    template_name,
    template_version,
    project_url,
    publishable_key,
    health_status
  )
  values (
    p_organization_id,
    p_store_id,
    p_connection_id,
    p_supabase_project_ref,
    p_supabase_organization_slug,
    p_project_name,
    p_region,
    p_template_name,
    p_template_version,
    p_project_url,
    p_publishable_key,
    p_health_status
  )
  returning id into v_database_id;

  return v_database_id;
end;
$$;

revoke all on function private.upsert_tenant_database(
  uuid, uuid, uuid, text, text, text, text, text, text, text, text, text
) from public, anon;

grant execute
on function private.upsert_tenant_database(
  uuid, uuid, uuid, text, text, text, text, text, text, text, text, text
) to authenticated;


-- ----------------------------------------------------------------------------
-- 3. Public wrapper: public.upsert_tenant_database
-- ----------------------------------------------------------------------------

create or replace function public.upsert_tenant_database(
  p_organization_id uuid,
  p_store_id uuid,
  p_connection_id uuid,
  p_supabase_project_ref text,
  p_supabase_organization_slug text,
  p_project_name text,
  p_region text,
  p_template_name text,
  p_template_version text,
  p_project_url text,
  p_publishable_key text,
  p_health_status text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.upsert_tenant_database(
    p_organization_id,
    p_store_id,
    p_connection_id,
    p_supabase_project_ref,
    p_supabase_organization_slug,
    p_project_name,
    p_region,
    p_template_name,
    p_template_version,
    p_project_url,
    p_publishable_key,
    p_health_status
  );
end;
$$;

revoke all on function public.upsert_tenant_database(
  uuid, uuid, uuid, text, text, text, text, text, text, text, text, text
) from public, anon;

grant execute
on function public.upsert_tenant_database(
  uuid, uuid, uuid, text, text, text, text, text, text, text, text, text
) to authenticated;


-- ============================================================================
-- End of Migration 013
-- ============================================================================
