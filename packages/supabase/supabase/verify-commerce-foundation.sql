-- Read-only verification query. Run in Supabase SQL Editor against the intended project.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'store_products','store_categories','store_product_variants','store_product_media',
    'store_collections','store_collection_products','store_variant_options',
    'store_variant_option_values','store_variant_values','store_inventory_locations',
    'store_inventory_levels','store_inventory_movements','customer_addresses',
    'store_carts','store_cart_items','store_wishlists','store_wishlist_items',
    'store_order_items','store_customization_templates','storefront_sections',
    'storefront_banners','store_audit_logs'
  )
order by table_name;

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename like any (array['store_%', 'customer_addresses']);

select id, name, public, created_at
from storage.buckets
order by created_at;
