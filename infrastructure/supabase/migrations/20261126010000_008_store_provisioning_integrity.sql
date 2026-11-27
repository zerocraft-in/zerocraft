
-- ============================================================================
-- Zerocraft Platform — Migration 008
-- Store provisioning integrity fixes.
--
-- Dependencies:
--   Migration 007: stores, supabase_connections, tenant_provisioning_jobs,
--                  tenant_provisioning_job_steps, enqueue_tenant_provisioning
--
-- Changes:
--   1. Drop global unique constraint on tenant_provisioning_jobs.idempotency_key
--      and replace with (organization_id, idempotency_key) scoped constraint.
--   2. Recreate private.enqueue_tenant_provisioning with:
--      - Advisory lock scoped to organization_id + idempotency_key
--      - Validation that p_connection_id belongs to p_organization_id
--   3. Recreate public.enqueue_tenant_provisioning wrapper (unchanged signature).
--   4. Re-apply identical grants (revoke public/anon, grant authenticated).
--
-- No data is deleted or rewritten.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Replace global idempotency unique constraint with org-scoped constraint
-- ----------------------------------------------------------------------------

-- The existing unique constraint on idempotency_key was created as an unnamed
-- column-level constraint in migration 007. PostgreSQL auto-names it
-- tenant_provisioning_jobs_idempotency_key_key. Drop it if it exists, then
-- add the organization-scoped replacement.
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'tenant_provisioning_jobs_idempotency_key_key'
      and conrelid = 'public.tenant_provisioning_jobs'::regclass
  ) then
    alter table public.tenant_provisioning_jobs
      drop constraint tenant_provisioning_jobs_idempotency_key_key;
  end if;
end
$$;

-- Add organization-scoped unique constraint so different organizations may
-- reuse the same idempotency key without collision.
alter table public.tenant_provisioning_jobs
  add constraint uq_tenant_provisioning_jobs_org_idempotency_key
    unique (organization_id, idempotency_key);


-- ----------------------------------------------------------------------------
-- 2. Recreate private.enqueue_tenant_provisioning with connection validation
--    and organization-scoped advisory lock
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

  -- Validate that the connection (if provided) belongs to this organization.
  if p_connection_id is not null then
    if not exists (
      select 1
      from public.supabase_connections
      where id = p_connection_id
        and organization_id = p_organization_id
    ) then
      raise exception
        'Connection does not belong to this organization';
    end if;
  end if;

  -- Advisory lock scoped to organization_id + idempotency_key so that
  -- different organizations can safely reuse the same idempotency key.
  v_lock_key := pg_catalog.hashtext(
    'zerocraft-enqueue-' || p_organization_id || '-' || p_idempotency_key
  )::bigint;

  perform pg_catalog.pg_advisory_xact_lock(v_lock_key);

  -- Idempotency: return existing job for the same key within this org.
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

revoke all on function private.enqueue_tenant_provisioning(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb
) from public, anon;

grant execute
on function private.enqueue_tenant_provisioning(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb
) to authenticated;


-- ----------------------------------------------------------------------------
-- 3. Recreate public.enqueue_tenant_provisioning wrapper
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

revoke all on function public.enqueue_tenant_provisioning(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb
) from public, anon;

grant execute
on function public.enqueue_tenant_provisioning(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb
) to authenticated;


-- ============================================================================
-- End of Migration 008
-- ============================================================================
