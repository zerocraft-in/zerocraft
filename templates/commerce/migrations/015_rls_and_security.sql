-- ============================================================================
-- Zerocraft Commerce Template — 015_rls_and_security
-- Enables RLS on every tenant table, creates store-scoped policies, grants,
-- and privilege-escalation guards.
--
-- Rules:
--   * Every tenant row is scoped by store_id and checked with
--     private.can_access_store(store_id).
--   * Every write additionally requires an explicit permission key.
--   * Ledgers (inventory_movements, payment_events, audit_logs) are written by
--     SECURITY DEFINER functions only; direct client writes are denied.
--   * Service role is used only by trusted server code and the provisioning
--     Worker.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Privilege escalation guard for tenant_members.
-- ----------------------------------------------------------------------------
create or replace function private.guard_tenant_member_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_actor_rank integer;
  v_target_rank integer;
  v_new_rank integer;
  v_owner_count integer;
begin
  v_actor_id := private.current_member_id();

  -- Service role / migrations have no member context and are trusted.
  if v_actor_id is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  select r.rank into v_actor_rank
  from public.tenant_members m
  join public.roles r on r.id = m.role_id
  where m.id = v_actor_id;

  if tg_op in ('UPDATE', 'DELETE') then
    select r.rank into v_target_rank
    from public.roles r
    where r.id = old.role_id;

    -- Never allow removing or demoting the final active owner.
    if old.role_id = (select id from public.roles where key = 'owner')
       and (tg_op = 'DELETE' or new.role_id is distinct from old.role_id or new.status <> 'active') then
      select count(*) into v_owner_count
      from public.tenant_members m
      where m.role_id = old.role_id and m.status = 'active';

      if v_owner_count <= 1 then
        raise exception 'cannot remove or demote the last active owner';
      end if;
    end if;

    if tg_op = 'UPDATE' and old.id = v_actor_id and new.role_id is distinct from old.role_id then
      raise exception 'members cannot change their own role';
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    select r.rank into v_new_rank from public.roles r where r.id = new.role_id;

    if v_new_rank is null then
      raise exception 'unknown role';
    end if;

    if v_new_rank >= coalesce(v_actor_rank, 0) then
      raise exception 'cannot assign a role at or above your own rank';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.guard_tenant_member_write() from public, anon;

drop trigger if exists tenant_members_guard_write on public.tenant_members;
create trigger tenant_members_guard_write
  before insert or update or delete on public.tenant_members
  for each row execute function private.guard_tenant_member_write();

-- ----------------------------------------------------------------------------
-- Generic store-scoped policies.
--
-- writable = false means: read policy only. All writes must go through a
-- SECURITY DEFINER RPC or the service role.
-- ----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('products',                 'products.view',  'products.manage',  true),
      ('variants',                 'products.view',  'products.manage',  true),
      ('product_options',          'products.view',  'products.manage',  true),
      ('product_option_values',    'products.view',  'products.manage',  true),
      ('variant_option_values',    'products.view',  'products.manage',  true),
      ('collections',              'products.view',  'products.manage',  true),
      ('collection_products',      'products.view',  'products.manage',  true),
      ('product_images',           'products.view',  'media.manage',     true),
      ('product_image_variants',   'products.view',  'media.manage',     true),
      ('media',                    'products.view',  'media.manage',     true),
      ('media_references',         'products.view',  'media.manage',     true),
      ('metafields',               'products.view',  'products.manage',  true),
      ('locations',                'inventory.view', 'inventory.manage', true),
      ('inventory_items',          'inventory.view', 'inventory.manage', true),
      ('inventory_levels',         'inventory.view', 'inventory.manage', true),
      ('inventory_movements',      'inventory.view', 'inventory.manage', false),
      ('customers',                'customers.view', 'customers.manage', true),
      ('customer_addresses',       'customers.view', 'customers.manage', true),
      ('orders',                   'orders.view',    'orders.manage',    true),
      ('order_line_items',         'orders.view',    'orders.manage',    true),
      ('order_addresses',          'orders.view',    'orders.manage',    true),
      ('order_adjustments',        'orders.view',    'orders.manage',    true),
      ('order_events',             'orders.view',    'orders.manage',    true),
      ('payments',                 'payments.view',  'payments.manage',  true),
      ('refunds',                  'payments.view',  'payments.manage',  true),
      ('payment_events',           'payments.view',  'payments.manage',  false),
      ('shipping_profiles',        'orders.view',    'shipping.manage',  true),
      ('shipping_zones',           'orders.view',    'shipping.manage',  true),
      ('shipping_rates',           'orders.view',    'shipping.manage',  true),
      ('fulfillments',             'orders.view',    'orders.manage',    true),
      ('fulfillment_line_items',   'orders.view',    'orders.manage',    true),
      ('sales_channels',           'channels.view',  'channels.manage',  true),
      ('product_publications',     'products.view',  'channels.manage',  true),
      ('pos_devices',              'pos.view',       'pos.operate',      true),
      ('pos_register_sessions',    'pos.view',       'pos.operate',      true),
      ('pos_cash_movements',       'pos.view',       'pos.operate',      false),
      ('pos_settings',             'pos.view',       'pos.operate',      true),
      ('webhook_endpoints',        'settings.view',  'settings.manage',  true),
      ('webhook_deliveries',       'settings.view',  'settings.manage',  false)
    ) as t(table_name, view_perm, manage_perm, writable)
  loop
    execute format('alter table public.%I enable row level security', r.table_name);

    execute format('drop policy if exists %I on public.%I',
      r.table_name || '_select', r.table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (private.can_access_store(store_id) and private.has_tenant_permission(%L))',
      r.table_name || '_select', r.table_name, r.view_perm);

    if r.writable then
      execute format('drop policy if exists %I on public.%I',
        r.table_name || '_insert', r.table_name);
      execute format(
        'create policy %I on public.%I for insert to authenticated with check (private.can_access_store(store_id) and private.has_tenant_permission(%L))',
        r.table_name || '_insert', r.table_name, r.manage_perm);

      execute format('drop policy if exists %I on public.%I',
        r.table_name || '_update', r.table_name);
      execute format(
        'create policy %I on public.%I for update to authenticated using (private.can_access_store(store_id) and private.has_tenant_permission(%L)) with check (private.can_access_store(store_id) and private.has_tenant_permission(%L))',
        r.table_name || '_update', r.table_name, r.manage_perm, r.manage_perm);

      execute format('drop policy if exists %I on public.%I',
        r.table_name || '_delete', r.table_name);
      execute format(
        'create policy %I on public.%I for delete to authenticated using (private.can_access_store(store_id) and private.has_tenant_permission(%L))',
        r.table_name || '_delete', r.table_name, r.manage_perm);
    end if;
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- Tables without a store_id column: tenant-wide read, restricted write.
-- ----------------------------------------------------------------------------
alter table public.tenant_context enable row level security;
alter table public.stores enable row level security;
alter table public.tenant_settings enable row level security;
alter table public.tenant_members enable row level security;
alter table public.tenant_member_stores enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.taxonomy_root_selections enable row level security;
alter table public.taxonomy_pin enable row level security;
alter table public.audit_logs enable row level security;
alter table public.store_counters enable row level security;
alter table public.outbox_events enable row level security;
alter table public.commerce_template_migrations enable row level security;
alter table public.product_public_id_registry enable row level security;

-- Tenant context: readable, never client-writable.
drop policy if exists tenant_context_select on public.tenant_context;
create policy tenant_context_select on public.tenant_context
  for select to authenticated using (private.is_tenant_member());

-- Stores.
drop policy if exists stores_select on public.stores;
create policy stores_select on public.stores
  for select to authenticated
  using (private.is_tenant_member() and private.can_access_store(id));

drop policy if exists stores_update on public.stores;
create policy stores_update on public.stores
  for update to authenticated
  using (private.can_access_store(id) and private.has_tenant_permission('settings.manage'))
  with check (private.can_access_store(id) and private.has_tenant_permission('settings.manage'));

-- Tenant settings.
drop policy if exists tenant_settings_select on public.tenant_settings;
create policy tenant_settings_select on public.tenant_settings
  for select to authenticated
  using (private.can_access_store(store_id) and private.has_tenant_permission('settings.view'));

drop policy if exists tenant_settings_update on public.tenant_settings;
create policy tenant_settings_update on public.tenant_settings
  for update to authenticated
  using (private.can_access_store(store_id) and private.has_tenant_permission('settings.manage'))
  with check (private.can_access_store(store_id) and private.has_tenant_permission('settings.manage'));

drop policy if exists tenant_settings_insert on public.tenant_settings;
create policy tenant_settings_insert on public.tenant_settings
  for insert to authenticated
  with check (private.can_access_store(store_id) and private.has_tenant_permission('settings.manage'));

-- Members: a member can always read their own row; users.view reads everyone.
drop policy if exists tenant_members_select on public.tenant_members;
create policy tenant_members_select on public.tenant_members
  for select to authenticated
  using (id = private.current_member_id() or private.has_tenant_permission('users.view'));

drop policy if exists tenant_members_insert on public.tenant_members;
create policy tenant_members_insert on public.tenant_members
  for insert to authenticated
  with check (private.has_tenant_permission('users.manage'));

drop policy if exists tenant_members_update on public.tenant_members;
create policy tenant_members_update on public.tenant_members
  for update to authenticated
  using (private.has_tenant_permission('users.manage'))
  with check (private.has_tenant_permission('users.manage'));

drop policy if exists tenant_members_delete on public.tenant_members;
create policy tenant_members_delete on public.tenant_members
  for delete to authenticated
  using (private.has_tenant_permission('users.manage'));

drop policy if exists tenant_member_stores_select on public.tenant_member_stores;
create policy tenant_member_stores_select on public.tenant_member_stores
  for select to authenticated
  using (
    private.can_access_store(store_id)
    and (member_id = private.current_member_id() or private.has_tenant_permission('users.view'))
  );

drop policy if exists tenant_member_stores_write on public.tenant_member_stores;
create policy tenant_member_stores_write on public.tenant_member_stores
  for all to authenticated
  using (private.can_access_store(store_id) and private.has_tenant_permission('users.manage'))
  with check (private.can_access_store(store_id) and private.has_tenant_permission('users.manage'));

-- RBAC catalogue: readable by members, writable only by migrations.
drop policy if exists roles_select on public.roles;
create policy roles_select on public.roles
  for select to authenticated using (private.is_tenant_member());

drop policy if exists permissions_select on public.permissions;
create policy permissions_select on public.permissions
  for select to authenticated using (private.is_tenant_member());

drop policy if exists role_permissions_select on public.role_permissions;
create policy role_permissions_select on public.role_permissions
  for select to authenticated using (private.is_tenant_member());

-- Taxonomy selection.
drop policy if exists taxonomy_root_selections_select on public.taxonomy_root_selections;
create policy taxonomy_root_selections_select on public.taxonomy_root_selections
  for select to authenticated
  using (private.is_tenant_member() and private.has_tenant_permission('products.view'));

drop policy if exists taxonomy_root_selections_write on public.taxonomy_root_selections;
create policy taxonomy_root_selections_write on public.taxonomy_root_selections
  for all to authenticated
  using (private.is_tenant_member() and private.has_tenant_permission('taxonomy.manage'))
  with check (private.is_tenant_member() and private.has_tenant_permission('taxonomy.manage'));

drop policy if exists taxonomy_pin_select on public.taxonomy_pin;
create policy taxonomy_pin_select on public.taxonomy_pin
  for select to authenticated using (private.is_tenant_member());

-- Audit log: read-only for clients.
drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using (private.can_access_store(store_id) and private.has_tenant_permission('audit.view'));

-- Counters and outbox are internal only; enable RLS with no client policies.

-- ----------------------------------------------------------------------------
-- Grants
-- ----------------------------------------------------------------------------
revoke all on all tables in schema public from public, anon;

do $$
declare
  r record;
begin
  for r in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format(
      'grant select, insert, update, delete on public.%I to authenticated',
      r.tablename
    );
  end loop;
end;
$$;

-- Ledgers and internal tables: RLS with no policy already denies, but revoke
-- table privileges as defence in depth.
revoke insert, update, delete on public.audit_logs from authenticated;
revoke insert, update, delete on public.inventory_movements from authenticated;
revoke insert, update, delete on public.payment_events from authenticated;
revoke insert, update, delete on public.pos_cash_movements from authenticated;
revoke insert, update, delete on public.webhook_deliveries from authenticated;
revoke all on public.commerce_template_migrations from authenticated;
revoke all on public.product_public_id_registry from authenticated;
revoke all on public.outbox_events from authenticated;
revoke all on public.tenant_context from authenticated;
revoke insert, update, delete on public.tenant_context from authenticated;
revoke all on public.store_counters from authenticated;

grant select on public.tenant_context to authenticated;

-- Service role is the only role allowed to bypass tenant policies.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- ----------------------------------------------------------------------------
-- Health/verification helper used by the provisioning Worker after install.
-- Service-role only.
-- ----------------------------------------------------------------------------
create or replace function public.commerce_template_health()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'template_version', (select template_version from public.tenant_context where id = 1),
    'initialized', exists (select 1 from public.tenant_context where id = 1),
    'tables', (
      select count(*) from pg_tables where schemaname = 'public'
    ),
    'tables_without_rls', (
      select coalesce(jsonb_agg(tablename order by tablename), '[]'::jsonb)
      from pg_tables
      where schemaname = 'public' and not rowsecurity
    ),
    'members', (select count(*) from public.tenant_members),
    'roles', (select count(*) from public.roles),
    'migration_ledger', (
      select coalesce(jsonb_agg(version order by version), '[]'::jsonb)
      from public.commerce_template_migrations
    )
  );
$$;

revoke all on function public.commerce_template_health() from public, anon, authenticated;
grant execute on function public.commerce_template_health() to service_role;

commit;
