
-- ============================================================================
-- Zerocraft Platform — Migration 009
-- Sales Channels schema (public namespace: sales_channels)
--
-- Dependencies:
--   Migration 001: private schema, updated_at_trigger(), platform_users
--   Migration 003: organizations and organization RBAC
--   Migration 004: organization_members
--   Migration 007: stores
--
-- Security:
--   * Two schemas: sales_channels (operational) and sales_channels_private (secrets)
--   * sales_channels_private is NOT exposed through Supabase Data API
--   * RLS enabled on all operational tables
--   * Direct DML blocked for authenticated; writes via SECURITY DEFINER RPCs
--   * SELECT restricted to active organization members
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Create schemas
-- ----------------------------------------------------------------------------

create schema if not exists sales_channels;
create schema if not exists sales_channels_private;

-- Grant usage on sales_channels to authenticated so they can read via RLS
grant usage on schema sales_channels to authenticated;
revoke all on schema sales_channels from public, anon;

-- sales_channels_private is NOT granted to authenticated — only service_role
-- and backend code can access it. Do not grant to authenticated.
revoke all on schema sales_channels_private from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 1. channels — central registry of available sales channels
-- ----------------------------------------------------------------------------

create table sales_channels.channels (
  id uuid not null default gen_random_uuid()
    constraint pk_channels primary key,

  key text not null unique
    constraint ck_channels_key
    check (key ~ '^[a-z][a-z0-9_-]{1,63}$'),

  name text not null
    constraint ck_channels_name
    check (char_length(trim(name)) between 2 and 120),

  description text null,

  category text not null
    constraint ck_channels_category
    check (category in ('marketplace', 'social', 'payments', 'shipping', 'pos', 'other')),

  provider_key text not null
    constraint ck_channels_provider_key
    check (char_length(trim(provider_key)) between 1 and 100),

  icon text null,

  capabilities jsonb not null default '{}'::jsonb
    constraint ck_channels_capabilities
    check (jsonb_typeof(capabilities) = 'object'),

  configuration_schema jsonb not null default '{}'::jsonb
    constraint ck_channels_configuration_schema
    check (jsonb_typeof(configuration_schema) = 'object'),

  status text not null default 'active'
    constraint ck_channels_status
    check (status in ('active', 'inactive', 'coming_soon')),

  is_available boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table sales_channels.channels is
  'Central registry of available sales channels. One row per channel type.';

comment on column sales_channels.channels.key is
  'Unique channel key, e.g. maara-online, meta, amazon.';

comment on column sales_channels.channels.provider_key is
  'Provider identifier, e.g. maara, meta, amazon. Used to load the provider adapter.';

comment on column sales_channels.channels.capabilities is
  'Structured capability flags, e.g. {"publish_products": true, "sync_inventory": true, "import_orders": true}.';

alter table sales_channels.channels enable row level security;

create index idx_channels_key on sales_channels.channels(key);
create index idx_channels_status on sales_channels.channels(status);
create index idx_channels_provider_key on sales_channels.channels(provider_key);

-- All authenticated organization members can view available channels.
create policy "channels_select_member"
on sales_channels.channels
for select
to authenticated
using (
  true
);

-- Direct writes are blocked; channels are managed via backend setup only.
create policy "channels_insert_blocked"
on sales_channels.channels
for insert
to authenticated
with check (false);

create policy "channels_update_blocked"
on sales_channels.channels
for update
to authenticated
using (false);

create policy "channels_delete_blocked"
on sales_channels.channels
for delete
to authenticated
using (false);

create trigger trg_channels_updated_at
before update on sales_channels.channels
for each row
execute function public.updated_at_trigger();


-- ----------------------------------------------------------------------------
-- 2. channel_installations — installed channel for a specific store
-- ----------------------------------------------------------------------------

create table sales_channels.channel_installations (
  id uuid not null default gen_random_uuid()
    constraint pk_channel_installations primary key,

  organization_id uuid not null
    constraint fk_channel_installations_organization_id
    references public.organizations(id)
    on delete cascade,

  store_id uuid not null
    constraint fk_channel_installations_store_id
    references public.stores(id)
    on delete cascade,

  channel_id uuid not null
    constraint fk_channel_installations_channel_id
    references sales_channels.channels(id)
    on delete cascade,

  status text not null default 'pending'
    constraint ck_channel_installations_status
    check (status in ('pending', 'connecting', 'configuration_required', 'active', 'paused', 'error', 'disconnecting', 'disconnected')),

  external_account_id text null,

  external_account_name text null,

  external_account_metadata jsonb not null default '{}'::jsonb
    constraint ck_channel_installations_external_account_metadata
    check (jsonb_typeof(external_account_metadata) = 'object'),

  installed_by uuid not null
    constraint fk_channel_installations_installed_by
    references public.platform_users(id),

  installed_at timestamptz null,

  connected_at timestamptz null,

  disconnected_at timestamptz null,

  last_synced_at timestamptz null,

  last_error_code text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_channel_installations_store_channel
    unique (store_id, channel_id)
);

comment on table sales_channels.channel_installations is
  'Represents an installed channel for a specific store.';

comment on column sales_channels.channel_installations.external_account_metadata is
  'Non-sensitive provider account metadata. Never store tokens or secrets here.';

alter table sales_channels.channel_installations enable row level security;

create index idx_channel_installations_organization_id on sales_channels.channel_installations(organization_id);
create index idx_channel_installations_store_id on sales_channels.channel_installations(store_id);
create index idx_channel_installations_channel_id on sales_channels.channel_installations(channel_id);
create index idx_channel_installations_status on sales_channels.channel_installations(status);

-- Members of the organization can view their channel installations.
create policy "channel_installations_select_member"
on sales_channels.channel_installations
for select
to authenticated
using (
  organization_id in (select private.current_org_ids())
);

-- Direct writes are blocked; installations are created via secure RPC.
create policy "channel_installations_insert_blocked"
on sales_channels.channel_installations
for insert
to authenticated
with check (false);

create policy "channel_installations_update_blocked"
on sales_channels.channel_installations
for update
to authenticated
using (false);

create policy "channel_installations_delete_blocked"
on sales_channels.channel_installations
for delete
to authenticated
using (false);

create trigger trg_channel_installations_updated_at
before update on sales_channels.channel_installations
for each row
execute function public.updated_at_trigger();


-- ----------------------------------------------------------------------------
-- 3. channel_settings — non-secret installation-specific configuration
-- ----------------------------------------------------------------------------

create table sales_channels.channel_settings (
  id uuid not null default gen_random_uuid()
    constraint pk_channel_settings primary key,

  installation_id uuid not null
    constraint fk_channel_settings_installation_id
    references sales_channels.channel_installations(id)
    on delete cascade,

  setting_key text not null
    constraint ck_channel_settings_setting_key
    check (char_length(trim(setting_key)) between 1 and 100),

  setting_value jsonb not null
    constraint ck_channel_settings_setting_value
    check (jsonb_typeof(setting_value) in ('object', 'array', 'string', 'number', 'boolean')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_channel_settings_installation_key
    unique (installation_id, setting_key)
);

comment on table sales_channels.channel_settings is
  'Non-secret installation-specific configuration. Never store OAuth tokens or private secrets here.';

alter table sales_channels.channel_settings enable row level security;

create index idx_channel_settings_installation_id on sales_channels.channel_settings(installation_id);

-- Members of the organization can view their channel settings.
create policy "channel_settings_select_member"
on sales_channels.channel_settings
for select
to authenticated
using (
  installation_id in (
    select ci.id
    from sales_channels.channel_installations ci
    where ci.organization_id in (select private.current_org_ids())
  )
);

-- Direct writes are blocked; settings are managed via secure RPC.
create policy "channel_settings_insert_blocked"
on sales_channels.channel_settings
for insert
to authenticated
with check (false);

create policy "channel_settings_update_blocked"
on sales_channels.channel_settings
for update
to authenticated
using (false);

create policy "channel_settings_delete_blocked"
on sales_channels.channel_settings
for delete
to authenticated
using (false);

create trigger trg_channel_settings_updated_at
before update on sales_channels.channel_settings
for each row
execute function public.updated_at_trigger();


-- Grant SELECT on sales_channels tables to authenticated (RLS policies restrict rows).
grant select on sales_channels.channels to authenticated;
grant select on sales_channels.channel_installations to authenticated;
grant select on sales_channels.channel_settings to authenticated;


-- ============================================================================
-- End of Migration 009 (sales_channels schema operational tables)
-- ============================================================================
