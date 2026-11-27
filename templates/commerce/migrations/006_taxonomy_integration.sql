-- ============================================================================
-- Zerocraft Commerce Template — 006_taxonomy_integration
-- Lightweight taxonomy integration.
--
-- The Shopify taxonomy catalogue (hundreds of thousands of nodes) is NOT
-- copied into each tenant project. It lives in Cloudflare R2 behind the
-- taxonomy Worker. A tenant stores only:
--   * the taxonomy version it has pinned,
--   * the subset of root/section categories it enabled,
--   * category GID references on products.
-- ============================================================================

begin;

create table if not exists public.taxonomy_root_selections (
  id uuid not null default gen_random_uuid() primary key,
  version text not null check (char_length(version) between 1 and 32),
  category_gid text not null
    check (category_gid ~ '^gid://shopify/TaxonomyCategory/[a-z0-9-]+$'),
  name text not null check (char_length(trim(name)) between 1 and 255),
  parent_gid text null
    check (parent_gid is null or parent_gid ~ '^gid://shopify/TaxonomyCategory/[a-z0-9-]+$'),
  position integer not null default 0 check (position >= 0),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint taxonomy_root_selections_version_gid_key unique (version, category_gid)
);

comment on table public.taxonomy_root_selections is
  'Tenant-selected subset of Shopify taxonomy categories. The full catalogue is served from R2 by the taxonomy Worker.';

create index if not exists taxonomy_root_selections_enabled_idx
  on public.taxonomy_root_selections(version, enabled, position);

drop trigger if exists taxonomy_root_selections_set_updated_at on public.taxonomy_root_selections;
create trigger taxonomy_root_selections_set_updated_at
  before update on public.taxonomy_root_selections
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Taxonomy pin
--
-- A single row records which immutable taxonomy artifact the tenant uses.
-- The checksum lets the Worker prove the pinned artifact is the one it served.
-- ----------------------------------------------------------------------------
create table if not exists public.taxonomy_pin (
  id smallint not null default 1 primary key check (id = 1),
  version text not null check (char_length(version) between 1 and 32),
  artifact_checksum text not null check (artifact_checksum ~ '^[a-f0-9]{64}$'),
  source_base_url text null check (source_base_url is null or char_length(source_base_url) <= 2048),
  pinned_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists taxonomy_pin_set_updated_at on public.taxonomy_pin;
create trigger taxonomy_pin_set_updated_at
  before update on public.taxonomy_pin
  for each row execute function public.set_updated_at();

-- Serialized taxonomy lookups cannot be forged: the resolver returns a row
-- only when the GID is in the enabled selection for the pinned version.
create or replace function public.resolve_taxonomy_category(p_gid text)
returns table (category_gid text, name text, parent_gid text, version text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.category_gid, s.name, s.parent_gid, s.version
  from public.taxonomy_root_selections s
  join public.taxonomy_pin p on p.version = s.version
  where s.category_gid = p_gid
    and s.enabled
  limit 1;
$$;

revoke all on function public.resolve_taxonomy_category(text) from public, anon;
grant execute on function public.resolve_taxonomy_category(text) to authenticated, service_role;

-- RLS and grants are created in 015.

commit;
