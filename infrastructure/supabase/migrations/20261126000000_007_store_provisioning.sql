
-- ============================================================================
-- Zerocraft Platform — Migration 007
-- Store provisioning infrastructure: stores, supabase connections,
-- tenant provisioning jobs, and the idempotent enqueue RPC.
--
-- Dependencies:
--   Migration 001: private schema, updated_at_trigger(), platform_users
--   Migration 003: organizations and organization RBAC
--   Migration 004: organization_members
--
-- Security:
--   * RLS enabled on all tables
--   * Direct DML blocked for authenticated; writes via SECURITY DEFINER RPC
--   * SELECT restricted to active organization members
--   * enqueue_tenant_provisioning validates caller org ownership
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Stores — organization-owned store directory
-- ----------------------------------------------------------------------------

create table public.stores (
  id uuid not null default gen_random_uuid()
    constraint pk_stores primary key,

  organization_id uuid not null
    constraint fk_stores_organization_id
    references public.organizations(id)
    on delete cascade,

  name text not null
    constraint ck_stores_name
    check (char_length(trim(name)) between 2 and 120),

  slug text not null unique
    constraint ck_stores_slug
    check (slug ~ '^[a-z0-9-]+$'),

  status text not null default 'draft'
    constraint ck_stores_status
    check (status in ('draft', 'active', 'archived')),

  metadata jsonb not null default '{}'::jsonb
    constraint ck_stores_metadata
    check (jsonb_typeof(metadata) = 'object'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.stores is
  'Organization-owned store directory. One or more stores per organization.';

comment on column public.stores.slug is
  'URL-safe unique identifier, lowercase [a-z0-9-].';

alter table public.stores enable row level security;

create index idx_stores_organization_id
  on public.stores(organization_id);

create index idx_stores_slug
  on public.stores(slug);

create index idx_stores_status
  on public.stores(status);

-- Members of the organization can view their stores.
create policy "stores_select_member"
on public.stores
for select
to authenticated
using (
  organization_id in (select private.current_org_ids())
);

-- Direct writes are blocked; stores are created via the provisioning RPC.
create policy "stores_insert_blocked"
on public.stores
for insert
to authenticated
with check (false);

create policy "stores_update_blocked"
on public.stores
for update
to authenticated
using (false);

create policy "stores_delete_blocked"
on public.stores
for delete
to authenticated
using (false);

create trigger trg_stores_updated_at
before update on public.stores
for each row
execute function public.updated_at_trigger();


-- ----------------------------------------------------------------------------
-- 2. Supabase connections — OAuth provider connection metadata
-- ----------------------------------------------------------------------------

create table public.supabase_connections (
  id uuid not null default gen_random_uuid()
    constraint pk_supabase_connections primary key,

  organization_id uuid not null
    constraint fk_supabase_connections_organization_id
    references public.organizations(id)
    on delete cascade,

  account_name text null,

  connection_status text not null default 'pending'
    constraint ck_supabase_connections_status
    check (connection_status in ('pending', 'active', 'revoked', 'error')),

  supabase_organization_id text null,

  supabase_organization_slug text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.supabase_connections is
  'OAuth connection metadata linking an organization to a customer Supabase account.';

alter table public.supabase_connections enable row level security;

create index idx_supabase_connections_organization_id
  on public.supabase_connections(organization_id);

create index idx_supabase_connections_status
  on public.supabase_connections(connection_status);

-- Members of the organization can view their connections.
create policy "supabase_connections_select_member"
on public.supabase_connections
for select
to authenticated
using (
  organization_id in (select private.current_org_ids())
);

-- Direct writes are blocked; connections are created via OAuth finalize.
create policy "supabase_connections_insert_blocked"
on public.supabase_connections
for insert
to authenticated
with check (false);

create policy "supabase_connections_update_blocked"
on public.supabase_connections
for update
to authenticated
using (false);

create policy "supabase_connections_delete_blocked"
on public.supabase_connections
for delete
to authenticated
using (false);

create trigger trg_supabase_connections_updated_at
before update on public.supabase_connections
for each row
execute function public.updated_at_trigger();


-- ----------------------------------------------------------------------------
-- 3. Tenant provisioning jobs — idempotent job tracking
-- ----------------------------------------------------------------------------

create table public.tenant_provisioning_jobs (
  id uuid not null default gen_random_uuid()
    constraint pk_tenant_provisioning_jobs primary key,

  organization_id uuid not null
    constraint fk_tenant_provisioning_jobs_organization_id
    references public.organizations(id)
    on delete cascade,

  store_id uuid not null
    constraint fk_tenant_provisioning_jobs_store_id
    references public.stores(id)
    on delete cascade,

  connection_id uuid null
    constraint fk_tenant_provisioning_jobs_connection_id
    references public.supabase_connections(id)
    on delete set null,

  idempotency_key text not null unique
    constraint ck_tenant_provisioning_jobs_idempotency_key
    check (char_length(trim(idempotency_key)) > 0),

  status text not null default 'queued'
    constraint ck_tenant_provisioning_jobs_status
    check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'needs_reauthorization')),

  current_step text null,

  progress int not null default 0
    constraint ck_tenant_provisioning_jobs_progress
    check (progress between 0 and 100),

  error_code text null,

  error_message text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tenant_provisioning_jobs is
  'Idempotent tenant provisioning job tracking. Keyed by (organization_id, idempotency_key).';

alter table public.tenant_provisioning_jobs enable row level security;

create index idx_tenant_provisioning_jobs_organization_id
  on public.tenant_provisioning_jobs(organization_id);

create index idx_tenant_provisioning_jobs_store_id
  on public.tenant_provisioning_jobs(store_id);

create index idx_tenant_provisioning_jobs_status
  on public.tenant_provisioning_jobs(status);

create index idx_tenant_provisioning_jobs_idempotency_key
  on public.tenant_provisioning_jobs(idempotency_key);

-- Members of the organization can view their jobs.
create policy "tenant_provisioning_jobs_select_member"
on public.tenant_provisioning_jobs
for select
to authenticated
using (
  organization_id in (select private.current_org_ids())
);

-- Direct writes are blocked; jobs are created via the enqueue RPC.
create policy "tenant_provisioning_jobs_insert_blocked"
on public.tenant_provisioning_jobs
for insert
to authenticated
with check (false);

create policy "tenant_provisioning_jobs_update_blocked"
on public.tenant_provisioning_jobs
for update
to authenticated
using (false);

create policy "tenant_provisioning_jobs_delete_blocked"
on public.tenant_provisioning_jobs
for delete
to authenticated
using (false);

create trigger trg_tenant_provisioning_jobs_updated_at
before update on public.tenant_provisioning_jobs
for each row
execute function public.updated_at_trigger();


-- ----------------------------------------------------------------------------
-- 4. Tenant provisioning job steps — step-level status
-- ----------------------------------------------------------------------------

create table public.tenant_provisioning_job_steps (
  id uuid not null default gen_random_uuid()
    constraint pk_tenant_provisioning_job_steps primary key,

  job_id uuid not null
    constraint fk_tenant_provisioning_job_steps_job_id
    references public.tenant_provisioning_jobs(id)
    on delete cascade,

  step text not null
    constraint ck_tenant_provisioning_job_steps_step
    check (char_length(trim(step)) > 0),

  status text not null default 'pending'
    constraint ck_tenant_provisioning_job_steps_status
    check (status in ('pending', 'running', 'succeeded', 'failed')),

  message text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tenant_provisioning_job_steps is
  'Step-level status and progress for tenant provisioning jobs.';

alter table public.tenant_provisioning_job_steps enable row level security;

create index idx_tenant_provisioning_job_steps_job_id
  on public.tenant_provisioning_job_steps(job_id);

create index idx_tenant_provisioning_job_steps_status
  on public.tenant_provisioning_job_steps(status);

-- Members of the organization can view job steps via their job.
create policy "tenant_provisioning_job_steps_select_member"
on public.tenant_provisioning_job_steps
for select
to authenticated
using (
  job_id in (
    select j.id
    from public.tenant_provisioning_jobs j
    where j.organization_id in (select private.current_org_ids())
  )
);

-- Direct writes are blocked; steps are updated by the provisioning worker.
create policy "tenant_provisioning_job_steps_insert_blocked"
on public.tenant_provisioning_job_steps
for insert
to authenticated
with check (false);

create policy "tenant_provisioning_job_steps_update_blocked"
on public.tenant_provisioning_job_steps
for update
to authenticated
using (false);

create policy "tenant_provisioning_job_steps_delete_blocked"
on public.tenant_provisioning_job_steps
for delete
to authenticated
using (false);

create trigger trg_tenant_provisioning_job_steps_updated_at
before update on public.tenant_provisioning_job_steps
for each row
execute function public.updated_at_trigger();


-- ----------------------------------------------------------------------------
-- 5. RPC: enqueue_tenant_provisioning
--
-- Secure, idempotent entry point for store provisioning. Validates that the
-- caller is an active organization member with stores.manage permission,
-- creates a draft store if none exists for the idempotency key, and inserts a
-- QUEUED job. Returns the job id.
-- ----------------------------------------------------------------------------

create or replace function private.enqueue_tenant_provisioning(
  p_organization_id uuid,
  p_store_id uuid,
  p_connection_id uuid,
  p_idempotency_key text,
  p_store_name text,
  p_project_name text,
  p_region text,
  p_template_name text,
  p_template_version text,
  p_metadata jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job_id uuid;
  v_existing_job uuid;
  v_store_row uuid;
  v_lock_key bigint;
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

  -- Global advisory lock on the idempotency key to prevent duplicates.
  v_lock_key := pg_catalog.hashtext(
    'zerocraft-enqueue-' || p_idempotency_key
  )::bigint;

  perform pg_catalog.pg_advisory_xact_lock(v_lock_key);

  -- Idempotency: return existing job for the same key.
  select id
  into v_existing_job
  from public.tenant_provisioning_jobs
  where idempotency_key = p_idempotency_key
    and organization_id = p_organization_id
  limit 1;

  if v_existing_job is not null then
    return v_existing_job;
  end if;

  -- Resolve or create the store. If p_store_id is provided, use it; otherwise
  -- create a draft store for this organization + slug.
  select id
  into v_store_row
  from public.stores
  where id = p_store_id
    and organization_id = p_organization_id;

  if v_store_row is null then
    insert into public.stores (
      organization_id,
      name,
      slug,
      status,
      metadata
    )
    values (
      p_organization_id,
      p_store_name,
      p_project_name,
      'draft',
      p_metadata
    )
    returning id into v_store_row;
  end if;

  -- Insert the job.
  insert into public.tenant_provisioning_jobs (
    organization_id,
    store_id,
    connection_id,
    idempotency_key,
    status,
    current_step,
    progress
  )
  values (
    p_organization_id,
    v_store_row,
    p_connection_id,
    p_idempotency_key,
    'queued',
    null,
    0
  )
  returning id into v_job_id;

  return v_job_id;
end;
$$;

-- FIXED: 10 arguments, matching the function definition above.
revoke all on function private.enqueue_tenant_provisioning(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb
) from public, anon;

grant execute
on function private.enqueue_tenant_provisioning(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb
) to authenticated;


-- ----------------------------------------------------------------------------
-- 6. Public wrapper: public.enqueue_tenant_provisioning
-- ----------------------------------------------------------------------------

create or replace function public.enqueue_tenant_provisioning(
  p_organization_id uuid,
  p_store_id uuid,
  p_connection_id uuid,
  p_idempotency_key text,
  p_store_name text,
  p_project_name text,
  p_region text,
  p_template_name text,
  p_template_version text,
  p_metadata jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.enqueue_tenant_provisioning(
    p_organization_id,
    p_store_id,
    p_connection_id,
    p_idempotency_key,
    p_store_name,
    p_project_name,
    p_region,
    p_template_name,
    p_template_version,
    p_metadata
  );
end;
$$;

-- FIXED: 10 arguments, matching the public wrapper definition above.
revoke all on function public.enqueue_tenant_provisioning(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb
) from public, anon;

grant execute
on function public.enqueue_tenant_provisioning(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb
) to authenticated;


-- ============================================================================
-- End of Migration 007
-- ============================================================================
