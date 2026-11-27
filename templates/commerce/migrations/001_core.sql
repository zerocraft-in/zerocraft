-- ============================================================================
-- Zerocraft Commerce Template — 001_core
-- Extensions, private helpers, tenant context, and stores.
--
-- Target: a disposable or customer-owned Supabase project ONLY.
-- Never apply to the Zerocraft Platform project.
-- ============================================================================

begin;

create extension if not exists "pgcrypto";
create extension if not exists "citext";

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Shared timestamp trigger
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Generic BEFORE UPDATE trigger that stamps updated_at.';

-- ----------------------------------------------------------------------------
-- JWT / identity helpers
--
-- Signature verification is performed by Supabase Auth before auth.jwt() is
-- populated. These helpers only compare already-verified claims with the
-- tenant context. Never use user_metadata for authorization.
-- ----------------------------------------------------------------------------
create or replace function private.jwt_claims()
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_claims jsonb;
begin
  begin
    v_claims := auth.jwt();
  exception when others then
    v_claims := null;
  end;

  if v_claims is null then
    begin
      v_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
    exception when others then
      v_claims := '{}'::jsonb;
    end;
  end if;

  return coalesce(v_claims, '{}'::jsonb);
end;
$$;

revoke all on function private.jwt_claims() from public, anon;
grant execute on function private.jwt_claims() to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Tenant context
--
-- Exactly one row. It describes which Zerocraft organization and central store
-- this customer-owned project serves. The Platform DB remains the source of
-- truth; this row is a local projection used for RLS and display.
-- ----------------------------------------------------------------------------
create table if not exists public.stores (
  id uuid not null default gen_random_uuid() primary key,
  central_store_ref uuid not null,
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  status text not null default 'active'
    check (status in ('active', 'suspended', 'archived')),
  currency char(3) not null default 'INR',
  timezone text not null default 'Asia/Kolkata',
  country char(2) not null default 'IN',
  address jsonb null check (address is null or jsonb_typeof(address) = 'object'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stores_central_ref_key unique (central_store_ref),
  constraint stores_slug_key unique (slug),
  constraint stores_id_store_key unique (id)
);

create index if not exists stores_status_idx on public.stores(status);
create unique index if not exists stores_one_default_idx
  on public.stores (is_default) where is_default;

drop trigger if exists stores_set_updated_at on public.stores;
create trigger stores_set_updated_at
  before update on public.stores
  for each row execute function public.set_updated_at();

create table if not exists public.tenant_context (
  id smallint not null default 1 primary key check (id = 1),
  organization_id uuid not null,
  organization_name text not null,
  central_store_id uuid not null,
  store_id uuid null references public.stores(id) on delete restrict,
  template_version text not null,
  taxonomy_version text null,
  platform_issuer text null,
  platform_audience text null,
  platform_jwks_url text null,
  local_auth_enabled boolean not null default true,
  initialized_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tenant_context is
  'Single local projection of the Zerocraft organization/store this customer-owned project serves.';
comment on column public.tenant_context.organization_id is
  'Zerocraft Platform organization UUID. Not a foreign key: the Platform DB is a separate identity domain.';
comment on column public.tenant_context.store_id is
  'Local store row. The central store id is retained separately for reconciliation.';
comment on column public.tenant_context.platform_issuer is
  'Expected iss claim if Zerocraft assertion JWTs are trusted by this project.';

drop trigger if exists tenant_context_set_updated_at on public.tenant_context;
create trigger tenant_context_set_updated_at
  before update on public.tenant_context
  for each row execute function public.set_updated_at();

-- RLS is enabled and all policies are created in 015_rls_and_security.sql.
-- The installer runs migrations sequentially; no client access is possible
-- before 015 completes.
revoke all on public.stores from public, anon;
revoke all on public.tenant_context from public, anon;
grant all on public.stores, public.tenant_context to service_role;

-- ----------------------------------------------------------------------------
-- Local template migration ledger
--
-- The provisioning Worker also records migrations in the Platform DB. This
-- local ledger lets a customer DBA prove what is installed without Platform
-- access. It is never the source of authorization.
-- ----------------------------------------------------------------------------
create table if not exists public.commerce_template_migrations (
  version text not null primary key,
  checksum text not null check (checksum ~ '^[a-f0-9]{64}$'),
  kind text not null default 'migration' check (kind in ('migration', 'seed', 'verify')),
  applied_at timestamptz not null default now()
);

alter table public.commerce_template_migrations enable row level security;
revoke all on public.commerce_template_migrations from public, anon, authenticated;
grant all on public.commerce_template_migrations to service_role;

commit;
