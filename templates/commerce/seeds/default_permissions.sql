-- ============================================================================
-- Seed: default_permissions
-- Idempotent permission catalogue. Permission keys are checked by code and by
-- RLS; never branch on role names in application logic.
-- ============================================================================

insert into public.permissions (key, "group", description) values
  ('products.view',      'catalog',   'View products, variants, collections and media metadata'),
  ('products.manage',    'catalog',   'Create, edit, archive and delete catalog records'),
  ('media.manage',       'catalog',   'Upload and attach media metadata'),
  ('taxonomy.manage',    'catalog',   'Change the pinned taxonomy and enabled categories'),
  ('inventory.view',     'inventory', 'View stock levels, locations and movements'),
  ('inventory.manage',   'inventory', 'Adjust stock, manage locations and transfers'),
  ('customers.view',     'customers', 'View customers and addresses'),
  ('customers.manage',   'customers', 'Create, edit and delete customers'),
  ('orders.view',        'orders',    'View orders, line items and fulfillments'),
  ('orders.manage',      'orders',    'Create, edit, cancel and fulfill orders'),
  ('payments.view',      'payments',  'View payments and refunds'),
  ('payments.manage',    'payments',  'Capture payments and issue refunds'),
  ('shipping.manage',    'shipping',  'Manage shipping profiles, zones and rates'),
  ('channels.view',      'channels',  'View sales channels and publications'),
  ('channels.manage',    'channels',  'Manage sales channels and publications'),
  ('pos.view',           'pos',       'View POS devices, sessions and settings'),
  ('pos.operate',        'pos',       'Open/close registers, record cash movements and sales'),
  ('settings.view',      'settings',  'View store settings and webhooks'),
  ('settings.manage',    'settings',  'Change store settings and webhook endpoints'),
  ('users.view',         'users',     'View tenant members and their store access'),
  ('users.manage',       'users',     'Invite, edit and remove tenant members'),
  ('audit.view',         'audit',     'View the tenant audit log'),
  ('reports.view',       'reports',   'View operational and financial reports')
on conflict (key) do update
  set "group" = excluded."group",
      description = excluded.description;
