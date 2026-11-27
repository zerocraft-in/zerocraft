-- ============================================================================
-- Seed: default_roles
-- Idempotent role catalogue and role→permission mapping.
--
-- Ranks enforce privilege escalation rules:
--   owner 100 > admin 80 > manager 60 > accountant 30 > staff 20
-- ============================================================================

insert into public.roles (key, name, description, rank, is_system) values
  ('owner',      'Owner',      'Full control including billing and ownership transfer', 100, true),
  ('admin',      'Admin',      'Manage settings, users, catalog and operations',          80, true),
  ('manager',    'Manager',    'Day-to-day operations, catalog and staff supervision',    60, true),
  ('accountant', 'Accountant', 'Financial reporting and read-only operations',            30, true),
  ('staff',      'Staff',      'Point-of-sale and read-only operational access',          20, true)
on conflict (key) do update
  set name = excluded.name,
      description = excluded.description,
      rank = excluded.rank,
      is_system = true;

with mapping(role_key, permission_key) as (
  values
    -- Owner and admin: everything.
    ('owner', 'products.view'), ('owner', 'products.manage'), ('owner', 'media.manage'),
    ('owner', 'taxonomy.manage'), ('owner', 'inventory.view'), ('owner', 'inventory.manage'),
    ('owner', 'customers.view'), ('owner', 'customers.manage'), ('owner', 'orders.view'),
    ('owner', 'orders.manage'), ('owner', 'payments.view'), ('owner', 'payments.manage'),
    ('owner', 'shipping.manage'), ('owner', 'channels.view'), ('owner', 'channels.manage'),
    ('owner', 'pos.view'), ('owner', 'pos.operate'), ('owner', 'settings.view'),
    ('owner', 'settings.manage'), ('owner', 'users.view'), ('owner', 'users.manage'),
    ('owner', 'audit.view'), ('owner', 'reports.view'),

    ('admin', 'products.view'), ('admin', 'products.manage'), ('admin', 'media.manage'),
    ('admin', 'taxonomy.manage'), ('admin', 'inventory.view'), ('admin', 'inventory.manage'),
    ('admin', 'customers.view'), ('admin', 'customers.manage'), ('admin', 'orders.view'),
    ('admin', 'orders.manage'), ('admin', 'payments.view'), ('admin', 'payments.manage'),
    ('admin', 'shipping.manage'), ('admin', 'channels.view'), ('admin', 'channels.manage'),
    ('admin', 'pos.view'), ('admin', 'pos.operate'), ('admin', 'settings.view'),
    ('admin', 'settings.manage'), ('admin', 'users.view'), ('admin', 'users.manage'),
    ('admin', 'audit.view'), ('admin', 'reports.view'),

    ('manager', 'products.view'), ('manager', 'products.manage'), ('manager', 'media.manage'),
    ('manager', 'taxonomy.manage'), ('manager', 'inventory.view'), ('manager', 'inventory.manage'),
    ('manager', 'customers.view'), ('manager', 'customers.manage'), ('manager', 'orders.view'),
    ('manager', 'orders.manage'), ('manager', 'payments.view'), ('manager', 'shipping.manage'),
    ('manager', 'channels.view'), ('manager', 'channels.manage'), ('manager', 'pos.view'),
    ('manager', 'pos.operate'), ('manager', 'settings.view'), ('manager', 'users.view'),
    ('manager', 'audit.view'), ('manager', 'reports.view'),

    ('accountant', 'products.view'), ('accountant', 'orders.view'), ('accountant', 'payments.view'),
    ('accountant', 'settings.view'), ('accountant', 'reports.view'), ('accountant', 'audit.view'),

    ('staff', 'products.view'), ('staff', 'inventory.view'), ('staff', 'customers.view'),
    ('staff', 'orders.view'), ('staff', 'pos.view'), ('staff', 'pos.operate'),
    ('staff', 'settings.view')
)
insert into public.role_permissions (role_id, permission_key)
select r.id, m.permission_key
from mapping m
join public.roles r on r.key = m.role_key
join public.permissions p on p.key = m.permission_key
on conflict (role_id, permission_key) do nothing;
