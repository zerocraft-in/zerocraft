import { createClient } from '@supabase/supabase-js';

const requiredTables = [
  'store_products', 'store_categories', 'store_product_variants', 'store_product_media',
  'store_collections', 'store_collection_products', 'store_variant_options',
  'store_variant_option_values', 'store_variant_values', 'store_inventory_locations',
  'store_inventory_levels', 'store_inventory_movements', 'customer_addresses',
  'store_carts', 'store_cart_items', 'store_wishlists', 'store_wishlist_items',
  'store_order_items', 'store_customization_templates', 'storefront_sections',
  'storefront_banners', 'store_audit_logs',
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(2);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
let failed = false;
for (const table of requiredTables) {
  // A schema-cache-aware row query detects missing tables more reliably than a HEAD request.
  const { error } = await supabase.from(table).select('*').limit(1);
  if (error) {
    failed = true;
    console.error('FAIL ' + table + ': ' + error.message);
  } else {
    console.log('OK   ' + table);
  }
}

if (failed) process.exit(1);
console.log('Commerce schema verification passed.');

