-- Phase 4B: read-only production verification queries.
-- Execute manually in the Supabase Dashboard SQL editor only after approval.
-- This file contains SELECT statements only. It does not read customer rows,
-- modify schema/data, run migrations, or expose credential values.
-- Assumptions to confirm in the target project: Supabase's standard
-- supabase_migrations.schema_migrations table exposes version, name, and
-- statements; storage.buckets is available in the storage schema; and the
-- standard PostgreSQL catalog views/functions used below are accessible.

-- 1. Applied migration history (Supabase CLI-managed history).
select 'migration_history' as verification_check,
       version, name, statements
from supabase_migrations.schema_migrations
order by version;

-- 2. RLS enablement for application tables.
select 'rls_enablement' as verification_check,
       n.nspname as schemaname,
       c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as force_rls
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and c.relname in (
    'profiles', 'store_orders', 'store_order_items', 'store_customizations',
    'store_checkout_requests', 'store_product_media', 'store_inventory_levels',
    'store_inventory_movements', 'store_integrations'
  )
order by table_name;

-- 2b. Required commerce object existence without selecting application rows.
select 'required_commerce_objects' as verification_check,
       n.nspname as schemaname,
       c.relname as object_name,
       case c.relkind
         when 'r' then 'table'
         when 'p' then 'partitioned table'
         when 'v' then 'view'
         when 'm' then 'materialized view'
         else c.relkind::text
       end as object_type
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'profiles', 'store_products', 'store_product_variants',
    'store_product_media', 'store_categories', 'store_collections',
    'store_collection_products', 'store_variant_options',
    'store_variant_option_values', 'store_variant_values',
    'store_inventory_locations', 'store_inventory_levels',
    'store_inventory_movements', 'store_inventory_reservations',
    'store_orders', 'store_order_items', 'store_checkout_requests',
    'store_customizations', 'store_customization_templates',
    'store_integrations'
  )
order by object_name;

-- 2c. Role model metadata only; this does not inspect profiles rows.
select 'user_role_enum' as verification_check,
       n.nspname as schemaname,
       t.typname as type_name,
       e.enumlabel as role_value,
       e.enumsortorder
from pg_catalog.pg_type t
join pg_catalog.pg_namespace n on n.oid = t.typnamespace
join pg_catalog.pg_enum e on e.enumtypid = t.oid
where n.nspname = 'public'
  and t.typname = 'user_role'
order by e.enumsortorder;

-- 3. Table policies without selecting table data.
select 'table_and_storage_policies' as verification_check,
       n.nspname as schemaname,
       p.tablename, p.policyname, p.permissive, p.roles,
       p.cmd, p.qual, p.with_check
from pg_catalog.pg_policies p
join pg_catalog.pg_namespace n on n.nspname = p.schemaname
where n.nspname in ('public', 'storage')
  and (
    p.tablename in (
      'profiles', 'store_orders', 'store_order_items', 'store_customizations',
      'store_checkout_requests', 'store_product_media', 'store_inventory_levels',
      'store_inventory_movements', 'store_integrations'
    )
    or (n.nspname = 'storage' and p.tablename = 'objects')
  )
order by n.nspname, p.tablename, p.policyname;

-- 4. Function ownership, security-definer status, and executable grants.
select 'function_security_and_grants' as verification_check,
       n.nspname as schemaname,
       p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_userbyid(p.proowner) as owner,
       p.prosecdef as security_definer,
       p.proconfig as configuration,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'is_studio_member', 'is_studio_admin',
    'create_transactional_checkout',
    'is_valid_customer_customization_registration',
    'release_order_reservations', 'fulfill_order_reservations',
    'studio_save_product_atomic_v2', 'studio_receive_inventory_transfer'
  )
order by function_name, arguments;

-- 5. Storage bucket metadata only; no object rows are selected.
select 'storage_buckets' as verification_check,
       id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('product-media', 'customer-customizations')
order by id;

-- 6. Storage policy inventory only.
select 'storage_object_policies' as verification_check,
       n.nspname as schemaname,
       p.tablename, p.policyname, p.roles, p.cmd, p.qual, p.with_check
from pg_catalog.pg_policies p
join pg_catalog.pg_namespace n on n.nspname = p.schemaname
where n.nspname = 'storage' and p.tablename = 'objects'
order by p.policyname;

-- 7. Checkout RPC existence and exact signatures.
select 'transactional_checkout_rpc' as verification_check,
       n.nspname as schemaname,
       p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_function_result(p.oid) as return_type,
       pg_get_userbyid(p.proowner) as owner,
       p.prosecdef as security_definer
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'create_transactional_checkout';
