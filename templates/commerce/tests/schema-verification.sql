-- ============================================================================
-- Verification: schema-verification
-- Fail-closed checks intended to run after 015 in a disposable database.
-- Every failure raises an exception, so the installer will not activate a
-- tenant database whose schema is incomplete.
-- ============================================================================

do $$
declare
  expected_tables text[] := array[
    'stores','tenant_context','commerce_template_migrations',
    'roles','permissions','role_permissions','tenant_members','tenant_member_stores',
    'tenant_settings','product_public_id_registry','products','variants',
    'product_options','product_option_values','variant_option_values',
    'media','product_images','product_image_variants','media_references',
    'collections','collection_products','metafields',
    'taxonomy_root_selections','taxonomy_pin',
    'locations','inventory_items','inventory_levels','inventory_movements',
    'customers','customer_addresses','store_counters',
    'orders','order_line_items','order_addresses','order_adjustments','order_events',
    'payments','refunds','payment_events',
    'shipping_profiles','shipping_zones','shipping_rates',
    'fulfillments','fulfillment_line_items',
    'sales_channels','product_publications',
    'pos_devices','pos_register_sessions','pos_cash_movements','pos_settings',
    'audit_logs','webhook_endpoints','webhook_deliveries','outbox_events'
  ];
  expected_functions text[] := array[
    'initialize_tenant','adjust_inventory','close_pos_session',
    'resolve_taxonomy_category','commerce_template_health',
    'seed_tenant_defaults','seed_tenant_channels'
  ];
  missing_tables text[];
  missing_functions text[];
  table_name text;
begin
  select coalesce(array_agg(name), '{}')
    into missing_tables
  from unnest(expected_tables) as name
  where to_regclass('public.' || name) is null;

  if cardinality(missing_tables) > 0 then
    raise exception 'missing tables: %', array_to_string(missing_tables, ', ');
  end if;

  select coalesce(array_agg(name), '{}')
    into missing_functions
  from unnest(expected_functions) as name
  where not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = name
  );

  if cardinality(missing_functions) > 0 then
    raise exception 'missing functions: %', array_to_string(missing_functions, ', ');
  end if;

  -- The compatibility view must exist and must not be a table.
  if to_regclass('public.product_variants') is null then
    raise exception 'missing compatibility view public.product_variants';
  end if;

  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'product_variants' and c.relkind <> 'v'
  ) then
    raise exception 'public.product_variants must be a view, not a table';
  end if;

  -- Variant uniqueness must live on the canonical table.
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'variants'
      and indexdef ilike '%public_id%'
  ) then
    raise exception 'variants.public_id is not uniquely indexed';
  end if;

  -- Money must never be floating point.
  select c.relname
    into table_name
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and a.attname like '%paise'
    and a.atttypid in ('float4'::regtype, 'float8'::regtype, 'numeric'::regtype)
  limit 1;

  if table_name is not null then
    raise exception 'money column on % uses a non-integer type', table_name;
  end if;

  -- Every table must be in the expected set (no accidental leftovers).
  for table_name in
    select tablename from pg_tables where schemaname = 'public'
  loop
    if not table_name = any(expected_tables) then
      raise exception 'unexpected table public.% — update the verification manifest', table_name;
    end if;
  end loop;

  raise notice 'schema-verification passed (% tables, % functions)',
    cardinality(expected_tables), cardinality(expected_functions);
end;
$$;
