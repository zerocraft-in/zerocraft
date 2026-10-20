-- Granular Studio RBAC. Role defaults are centrally seeded; per-user overrides
-- are explicit and audited by the CMS API.
create table if not exists public.studio_permissions (
  key text primary key check (key ~ '^[a-z][a-z0-9_.:-]{1,80}$'),
  label text not null,
  description text not null default '',
  group_name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.studio_role_permissions (
  role text not null check (role in ('admin', 'manager', 'staff')),
  permission_key text not null references public.studio_permissions(key) on delete cascade,
  allowed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (role, permission_key)
);

create table if not exists public.studio_user_permissions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission_key text not null references public.studio_permissions(key) on delete cascade,
  allowed boolean not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (user_id, permission_key)
);

create index if not exists studio_user_permissions_user_idx on public.studio_user_permissions(user_id);

insert into public.studio_permissions (key, label, description, group_name, sort_order) values
  ('dashboard.read', 'View dashboard', 'View the CMS overview and workspace metrics.', 'Workspace', 10),
  ('content.read', 'View content', 'View works, journal stories, and publishing data.', 'Content', 20),
  ('content.manage', 'Manage content', 'Create, edit, publish, and delete works and journal stories.', 'Content', 21),
  ('clients.read', 'View clients', 'View the client directory.', 'Customers', 30),
  ('clients.manage', 'Manage clients', 'Create, edit, and delete client records.', 'Customers', 31),
  ('appointments.read', 'View appointments', 'View appointment schedules and details.', 'Operations', 40),
  ('appointments.manage', 'Manage appointments', 'Create, reschedule, update, and delete appointments.', 'Operations', 41),
  ('catalog.read', 'View catalog', 'View products, categories, and storefront configuration.', 'Commerce', 50),
  ('catalog.manage', 'Manage catalog', 'Create, edit, archive, and delete products and categories.', 'Commerce', 51),
  ('inventory.read', 'View inventory', 'View inventory locations and stock levels.', 'Commerce', 60),
  ('inventory.manage', 'Manage inventory', 'Adjust stock, reorder points, and inventory locations.', 'Commerce', 61),
  ('orders.read', 'View orders', 'View store orders and payment status.', 'Commerce', 70),
  ('orders.manage', 'Manage orders', 'Update order and fulfilment status.', 'Commerce', 71),
  ('reports.read', 'View reports', 'View operational, sales, and accounting reports.', 'Insights', 80),
  ('notifications.read', 'View notifications', 'View and acknowledge workspace notifications.', 'System', 90),
  ('notifications.manage', 'Manage notifications', 'Configure notifications and recipient preferences.', 'System', 91),
  ('automations.read', 'View automation health', 'View scheduled job health and run history.', 'System', 100),
  ('automations.manage', 'Manage automations', 'Change automation settings and trigger manual runs.', 'System', 101),
  ('audit.read', 'View audit log', 'Review security and operational audit events.', 'System', 110),
  ('audit.write', 'Write audit events', 'Record audit events from Studio actions.', 'System', 111),
  ('team.read', 'View team', 'View team members and invitation history.', 'Team', 120),
  ('team.manage', 'Manage team', 'Invite, suspend, remove, and change team access.', 'Team', 121),
  ('settings.manage', 'Manage settings', 'Change workspace and integration settings.', 'System', 130),
  ('billing.read', 'View billing', 'View transactions, subscriptions, and disputes.', 'Finance', 140),
  ('billing.manage', 'Manage billing', 'Manage payment and billing records.', 'Finance', 141)
on conflict (key) do update set label = excluded.label, description = excluded.description, group_name = excluded.group_name, sort_order = excluded.sort_order;

-- Admins receive every permission. Manager/staff defaults are deliberately
-- conservative and can be refined per user in the CMS.
insert into public.studio_role_permissions (role, permission_key, allowed)
select 'admin', key, true from public.studio_permissions
on conflict (role, permission_key) do update set allowed = excluded.allowed, updated_at = now();

insert into public.studio_role_permissions (role, permission_key, allowed)
select role_name, permission_key, true
from (values
  ('manager', 'dashboard.read'), ('manager', 'content.read'), ('manager', 'content.manage'),
  ('manager', 'clients.read'), ('manager', 'clients.manage'), ('manager', 'appointments.read'),
  ('manager', 'appointments.manage'), ('manager', 'catalog.read'), ('manager', 'catalog.manage'),
  ('manager', 'inventory.read'), ('manager', 'inventory.manage'), ('manager', 'orders.read'),
  ('manager', 'orders.manage'), ('manager', 'reports.read'), ('manager', 'notifications.read'),
  ('manager', 'notifications.manage'), ('manager', 'automations.read'), ('manager', 'audit.read'),
  ('manager', 'audit.write'), ('manager', 'billing.read'),
  ('staff', 'dashboard.read'), ('staff', 'content.read'), ('staff', 'content.manage'),
  ('staff', 'clients.read'), ('staff', 'appointments.read'), ('staff', 'appointments.manage'),
  ('staff', 'catalog.read'), ('staff', 'inventory.read'), ('staff', 'orders.read'),
  ('staff', 'notifications.read'), ('staff', 'automations.read'), ('staff', 'audit.write')
) as defaults(role_name, permission_key)
on conflict (role, permission_key) do update set allowed = excluded.allowed, updated_at = now();

create or replace function public.studio_has_permission(p_permission text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles p
    left join public.studio_user_permissions up
      on up.user_id = p.id and up.permission_key = p_permission
    left join public.studio_role_permissions rp
      on rp.role = p.role::text and rp.permission_key = p_permission
    where p.id = (select auth.uid())
      and p.is_active
      and p.role::text in ('admin', 'manager', 'staff')
      and coalesce(up.allowed, rp.allowed, false)
  );
$$;

create or replace function public.studio_permissions_for_current_user()
returns table(permission_key text)
language sql stable security definer set search_path = '' as $$
  select sp.key
  from public.studio_permissions sp
  where public.studio_has_permission(sp.key)
  order by sp.sort_order, sp.key;
$$;

revoke all on function public.studio_has_permission(text) from public;
revoke all on function public.studio_permissions_for_current_user() from public;
grant execute on function public.studio_has_permission(text) to authenticated;
grant execute on function public.studio_permissions_for_current_user() to authenticated;

alter table public.studio_permissions enable row level security;
alter table public.studio_role_permissions enable row level security;
alter table public.studio_user_permissions enable row level security;

drop policy if exists "Studio members read permissions" on public.studio_permissions;
create policy "Studio members read permissions" on public.studio_permissions for select to authenticated
  using (public.is_studio_member());
drop policy if exists "Admins manage role permissions" on public.studio_role_permissions;
create policy "Admins manage role permissions" on public.studio_role_permissions for all to authenticated
  using (public.is_studio_admin()) with check (public.is_studio_admin());
drop policy if exists "Users read own permission overrides" on public.studio_user_permissions;
create policy "Users read own permission overrides" on public.studio_user_permissions for select to authenticated
  using (user_id = (select auth.uid()) or public.is_studio_admin());
drop policy if exists "Admins manage user permission overrides" on public.studio_user_permissions;
create policy "Admins manage user permission overrides" on public.studio_user_permissions for all to authenticated
  using (public.is_studio_admin()) with check (public.is_studio_admin());

revoke all on public.studio_permissions, public.studio_role_permissions, public.studio_user_permissions from anon, authenticated;
grant select on public.studio_permissions to authenticated;
grant select on public.studio_role_permissions to authenticated;
grant select on public.studio_user_permissions to authenticated;
grant insert, update, delete on public.studio_user_permissions to authenticated;

-- Convert the main data policies to permission-aware policies. Public read
-- policies remain unchanged where they already exist.
drop policy if exists "Studio manage blogs" on public.blogs;
create policy "Permission manage blogs" on public.blogs for all to authenticated
  using (public.studio_has_permission('content.manage')) with check (public.studio_has_permission('content.manage'));
drop policy if exists "Studio manage works" on public.works;
create policy "Permission manage works" on public.works for all to authenticated
  using (public.studio_has_permission('content.manage')) with check (public.studio_has_permission('content.manage'));
drop policy if exists "Studio manage clients" on public.clients;
create policy "Permission manage clients" on public.clients for all to authenticated
  using (public.studio_has_permission('clients.manage')) with check (public.studio_has_permission('clients.manage'));
drop policy if exists "Studio manage appointments" on public.appointments;
create policy "Permission manage appointments" on public.appointments for all to authenticated
  using (public.studio_has_permission('appointments.manage')) with check (public.studio_has_permission('appointments.manage'));
drop policy if exists "Studio manage notifications" on public.notifications;
create policy "Permission manage notifications" on public.notifications for all to authenticated
  using (public.studio_has_permission('notifications.manage') or public.studio_has_permission('notifications.read'))
  with check (public.studio_has_permission('notifications.manage') or public.studio_has_permission('notifications.read'));
drop policy if exists "Studio manage store categories" on public.store_categories;
create policy "Permission manage store categories" on public.store_categories for all to authenticated
  using (public.studio_has_permission('catalog.manage')) with check (public.studio_has_permission('catalog.manage'));
drop policy if exists "Studio manage store products" on public.store_products;
create policy "Permission manage store products" on public.store_products for all to authenticated
  using (public.studio_has_permission('catalog.manage')) with check (public.studio_has_permission('catalog.manage'));
drop policy if exists "Studio manage store variants" on public.store_product_variants;
create policy "Permission manage store variants" on public.store_product_variants for all to authenticated
  using (public.studio_has_permission('catalog.manage')) with check (public.studio_has_permission('catalog.manage'));
drop policy if exists "Studio read store orders" on public.store_orders;
create policy "Permission read store orders" on public.store_orders for select to authenticated
  using (public.studio_has_permission('orders.read'));
drop policy if exists "Studio update order status" on public.store_orders;
create policy "Permission update order status" on public.store_orders for update to authenticated
  using (public.studio_has_permission('orders.manage')) with check (public.studio_has_permission('orders.manage'));
