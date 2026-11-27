
-- ============================================================================
-- Zerocraft Platform — Migration 012
-- Sales Channels seed data and secure RPCs
--
-- Dependencies:
--   Migration 009: sales_channels schema operational tables
--   Migration 010: sales_channels schema continued tables
--   Migration 011: sales_channels_private schema
--
-- Security:
--   * All RPCs are SECURITY DEFINER in private schema
--   * Public wrappers are SECURITY INVOKER
--   * EXECUTE granted to authenticated only
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Seed: sales_channels.channels
-- ----------------------------------------------------------------------------

insert into sales_channels.channels (
  key,
  name,
  description,
  category,
  provider_key,
  icon,
  capabilities,
  configuration_schema,
  status,
  is_available
)
values
  (
    'maara-online',
    'Maara Online Store',
    'Native Maara storefront channel. Publish products to your own Maara-powered online store.',
    'other',
    'maara',
    'Store',
    '{"publish_products": true, "update_products": true, "unpublish_products": true, "sync_inventory": true, "import_orders": false, "validate_connection": true}',
    '{"type": "object", "properties": {}}',
    'active',
    true
  ),
  (
    'meta',
    'Meta (Facebook & Instagram)',
    'Connect your Meta business account to sync catalog and publish products to Facebook and Instagram Shops.',
    'social',
    'meta',
    'Share2',
    '{"publish_products": true, "update_products": true, "unpublish_products": true, "sync_inventory": true, "import_orders": false, "validate_connection": true}',
    '{"type": "object", "properties": {}}',
    'coming_soon',
    false
  ),
  (
    'amazon',
    'Amazon',
    'Sell on Amazon by syncing your catalog and importing orders.',
    'marketplace',
    'amazon',
    'ShoppingCart',
    '{"publish_products": true, "update_products": true, "unpublish_products": true, "sync_inventory": true, "import_orders": true, "validate_connection": true}',
    '{"type": "object", "properties": {}}',
    'coming_soon',
    false
  )
on conflict (key) do nothing;


-- ----------------------------------------------------------------------------
-- 1. Seed: organization permissions for sales_channels
-- ----------------------------------------------------------------------------

insert into public.organization_permissions (
  key,
  "group",
  description
)
values
  ('sales_channels.view', 'Store Management', 'View sales channels and installations'),
  ('sales_channels.manage', 'Store Management', 'Install, configure, and manage sales channels'),
  ('sales_channels.publish', 'Store Management', 'Publish and manage products on sales channels')
on conflict (key) do nothing;


-- ----------------------------------------------------------------------------
-- 2. Seed: organization role_permissions for sales_channels
-- ----------------------------------------------------------------------------

-- Owner: all sales_channels permissions.
insert into public.organization_role_permissions (
  role_id,
  permission_key
)
select r.id, p.key
from public.organization_roles r
cross join public.organization_permissions p
where r.key = 'owner'
  and p.key like 'sales_channels.%'
on conflict do nothing;

-- Admin: all sales_channels permissions.
insert into public.organization_role_permissions (
  role_id,
  permission_key
)
select r.id, p.key
from public.organization_roles r
cross join public.organization_permissions p
where r.key = 'admin'
  and p.key like 'sales_channels.%'
on conflict do nothing;

-- Manager: view and publish only.
insert into public.organization_role_permissions (
  role_id,
  permission_key
)
select r.id, p.key
from public.organization_roles r
cross join public.organization_permissions p
where r.key = 'manager'
  and p.key in (
    'sales_channels.view',
    'sales_channels.publish'
  )
on conflict do nothing;

-- Staff: view only.
insert into public.organization_role_permissions (
  role_id,
  permission_key
)
select r.id, p.key
from public.organization_roles r
cross join public.organization_permissions p
where r.key = 'staff'
  and p.key in (
    'sales_channels.view'
  )
on conflict do nothing;


-- ----------------------------------------------------------------------------
-- 3. Secure RPCs for channel installation management
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 3a. private.install_channel — install a channel for a store
-- ----------------------------------------------------------------------------

create or replace function private.install_channel(
  p_organization_id uuid,
  p_store_id uuid,
  p_channel_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_channel_id uuid;
  v_installation_id uuid;
  v_lock_key bigint;
  v_existing_installation uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  -- Validate organization membership and sales_channels.manage permission.
  if not private.has_org_permission(
    p_organization_id,
    'sales_channels.manage'
  ) then
    raise exception 'Caller is not authorized to manage sales channels in this organization';
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

  -- Resolve channel.
  select id
  into v_channel_id
  from sales_channels.channels
  where key = p_channel_key
    and status = 'active'
    and is_available = true;

  if v_channel_id is null then
    raise exception 'Channel not found or not available';
  end if;

  -- Advisory lock scoped to store + channel to prevent duplicate installations.
  v_lock_key := pg_catalog.hashtext(
    'zerocraft-install-channel-' || p_store_id || '-' || v_channel_id::text
  )::bigint;

  perform pg_catalog.pg_advisory_xact_lock(v_lock_key);

  -- Idempotency: return existing installation if any.
  select id
  into v_existing_installation
  from sales_channels.channel_installations
  where store_id = p_store_id
    and channel_id = v_channel_id
  limit 1;

  if v_existing_installation is not null then
    return v_existing_installation;
  end if;

  -- Create the installation.
  insert into sales_channels.channel_installations (
    organization_id,
    store_id,
    channel_id,
    status,
    installed_by,
    installed_at
  )
  values (
    p_organization_id,
    p_store_id,
    v_channel_id,
    'pending',
    auth.uid(),
    now()
  )
  returning id into v_installation_id;

  return v_installation_id;
end;
$$;

revoke all on function private.install_channel(uuid, uuid, text)
from public, anon;

grant execute
on function private.install_channel(uuid, uuid, text)
to authenticated;


-- ----------------------------------------------------------------------------
-- 3b. public.install_channel — public wrapper
-- ----------------------------------------------------------------------------

create or replace function public.install_channel(
  p_organization_id uuid,
  p_store_id uuid,
  p_channel_key text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.install_channel(
    p_organization_id,
    p_store_id,
    p_channel_key
  );
end;
$$;

revoke all on function public.install_channel(uuid, uuid, text)
from public, anon;

grant execute
on function public.install_channel(uuid, uuid, text)
to authenticated;


-- ----------------------------------------------------------------------------
-- 3c. private.update_channel_installation_status — update installation status
-- ----------------------------------------------------------------------------

create or replace function private.update_channel_installation_status(
  p_installation_id uuid,
  p_status text,
  p_external_account_id text,
  p_external_account_name text,
  p_external_account_metadata jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  -- Validate that the installation belongs to the caller's organization
  -- and the caller has sales_channels.manage permission.
  select ci.organization_id
  into v_org_id
  from sales_channels.channel_installations ci
  where ci.id = p_installation_id;

  if v_org_id is null then
    raise exception 'Installation not found';
  end if;

  if not private.has_org_permission(
    v_org_id,
    'sales_channels.manage'
  ) then
    raise exception 'Caller is not authorized to manage sales channels in this organization';
  end if;

  update sales_channels.channel_installations
  set status = p_status,
      external_account_id = p_external_account_id,
      external_account_name = p_external_account_name,
      external_account_metadata = p_external_account_metadata,
      connected_at = case when p_status = 'active' then now() else connected_at end,
      disconnected_at = case when p_status = 'disconnected' then now() else disconnected_at end,
      updated_at = now()
  where id = p_installation_id;
end;
$$;

revoke all on function private.update_channel_installation_status(uuid, text, text, text, jsonb)
from public, anon;

grant execute
on function private.update_channel_installation_status(uuid, text, text, text, jsonb)
to authenticated;


-- ----------------------------------------------------------------------------
-- 3d. public.update_channel_installation_status — public wrapper
-- ----------------------------------------------------------------------------

create or replace function public.update_channel_installation_status(
  p_installation_id uuid,
  p_status text,
  p_external_account_id text,
  p_external_account_name text,
  p_external_account_metadata jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.update_channel_installation_status(
    p_installation_id,
    p_status,
    p_external_account_id,
    p_external_account_name,
    p_external_account_metadata
  );
end;
$$;

revoke all on function public.update_channel_installation_status(uuid, text, text, text, jsonb)
from public, anon;

grant execute
on function public.update_channel_installation_status(uuid, text, text, text, jsonb)
to authenticated;


-- ----------------------------------------------------------------------------
-- 3e. private.disconnect_channel — disconnect a channel installation
-- ----------------------------------------------------------------------------

create or replace function private.disconnect_channel(
  p_installation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  -- Validate ownership.
  select ci.organization_id
  into v_org_id
  from sales_channels.channel_installations ci
  where ci.id = p_installation_id;

  if v_org_id is null then
    raise exception 'Installation not found';
  end if;

  if not private.has_org_permission(
    v_org_id,
    'sales_channels.manage'
  ) then
    raise exception 'Caller is not authorized to manage sales channels in this organization';
  end if;

  -- Revoke credentials via secure RPC (in private schema).
  -- Note: credential revocation is handled by provider-specific logic;
  -- here we just mark the installation as disconnected.
  update sales_channels.channel_installations
  set status = 'disconnected',
      disconnected_at = now(),
      updated_at = now()
  where id = p_installation_id;
end;
$$;

revoke all on function private.disconnect_channel(uuid)
from public, anon;

grant execute
on function private.disconnect_channel(uuid)
to authenticated;


-- ----------------------------------------------------------------------------
-- 3f. public.disconnect_channel — public wrapper
-- ----------------------------------------------------------------------------

create or replace function public.disconnect_channel(
  p_installation_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.disconnect_channel(p_installation_id);
end;
$$;

revoke all on function public.disconnect_channel(uuid)
from public, anon;

grant execute
on function public.disconnect_channel(uuid)
to authenticated;


-- ============================================================================
-- End of Migration 012 (sales_channels seed data and RPCs)
-- ============================================================================
