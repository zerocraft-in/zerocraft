// Zerocraft Platform — Static test: verify no commerce tables or customer/demo data
// Reads migration SQL and seed files. No database connection.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE = path.join(__dirname, '..', '..');
const MIGRATIONS_DIR = path.join(BASE, 'migrations');
const SEED_FILE = path.join(BASE, 'seed.sql');

const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
const contents = {};
for (const f of files) {
  contents[f] = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
}
const allSql = Object.values(contents).join('\n');
const seedSql = fs.existsSync(SEED_FILE) ? fs.readFileSync(SEED_FILE, 'utf8') : '';

let failures = 0;
function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
}

// 1. No commerce table names
const commerceTables = [
  'products', 'variants', 'product_options', 'categories', 'collections',
  'customers', 'customer_addresses', 'orders', 'order_items', 'order_status',
  'payments', 'payment_transactions', 'shipments', 'shipping_methods',
  'sales_channels', 'pos_registers', 'pos_sessions', 'pos_transactions',
  'taxonomy_roots', 'taxonomy_nodes', 'media', 'media_references',
  'locations', 'location_settings', 'discounts', 'gift_cards',
  'stores', 'store_settings', 'store_members'
];
for (const t of commerceTables) {
  check(`No commerce table "public.${t}"`, !new RegExp(`create table public\\.${t}\\b`).test(allSql));
}

// 2. No templates/commerce content referenced inside migrations
check('No templates/commerce/ path referenced in migrations', !/templates\/commerce\//.test(allSql));

// 3. seed.sql contains no customer, organization, store, or demo data
const demoKeywords = ['maran', 'maara merch', 'sample customer', 'demo organization', 'demo store', 'fake subscription', 'fake invoice', 'demo credential'];
const seedLower = seedSql.toLowerCase();
for (const kw of demoKeywords) {
  check(`seed.sql does not mention "${kw}"`, !seedLower.includes(kw));
}

// 4. seed.sql has no INSERT into customer-facing tables
check('seed.sql has no INSERT into organizations', !/insert into public\.organizations/i.test(seedSql));
check('seed.sql has no INSERT into stores', !/insert into public\.stores/i.test(seedSql));
check('seed.sql has no INSERT into products', !/insert into public\.products/i.test(seedSql));
check('seed.sql has no INSERT into customers', !/insert into public\.customers/i.test(seedSql));

// 5. seed.sql is empty or reserved (only comments)
const seedNonComment = seedSql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
check('seed.sql contains no executable SQL (empty/reserved)', seedNonComment.length === 0, `non-comment length: ${seedNonComment.length}`);

// 6. No customer data creation in any migration
check('No migration creates customer organizations', !/insert into public\.organizations \(name/.test(allSql));
check('No migration creates sample stores', !/insert into public\.stores/i.test(allSql));
check('No migration creates sample customers', !/insert into public\.customers/i.test(allSql));

// 7. No demo integration credentials
check('No demo integration credentials in migrations', !/(api_key|secret_key|access_token)\s*=\s*['"][a-zA-Z0-9]{20,}/i.test(allSql));

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
