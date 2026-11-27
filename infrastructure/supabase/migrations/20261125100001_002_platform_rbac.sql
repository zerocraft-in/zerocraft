
-- ============================================================================
-- Zerocraft Platform — Migration 002
-- Platform access control: roles, permissions, role_permissions, platform_members.
--
-- Platform roles are separate from organization roles. Platform Owner is
-- assigned only through the secure bootstrap mechanism.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Platform roles
-- ----------------------------------------------------------------------------

create table public.platform_roles (
  id uuid not null default gen_random_uuid()
    constraint pk_platform_roles primary key,
  key text not null unique
    constraint ck_platform_roles_key check (
      key in (
        'platform_owner',
        'platform_admin',
        'platform_reviewer',
        'platform_support'
      )
    ),
  name text not null,
  description text null,
  rank int not null default 0
    constraint ck_platform_roles_rank check (rank >= 0),
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.platform_roles is
  'System platform roles ordered by rank. Platform Owner is highest rank.';

comment on column public.platform_roles.rank is
  'Used to prevent privilege escalation. Platform Owner = highest.';

comment on column public.platform_roles.is_system is
  'System roles cannot be deleted by clients.';

alter table public.platform_roles enable row level security;

create policy "platform_roles_select_all"
on public.platform_roles
for select
to authenticated
using (true);

create policy "platform_roles_insert_blocked"
on public.platform_roles
for insert
to authenticated
with check (false);

create policy "platform_roles_update_blocked"
on public.platform_roles
for update
to authenticated
using (false);

create policy "platform_roles_delete_blocked"
on public.platform_roles
for delete
to authenticated
using (false);

create trigger trg_platform_roles_updated_at
before update on public.platform_roles
for each row
execute function public.updated_at_trigger();

-- ----------------------------------------------------------------------------
-- 2. Platform permissions
-- ----------------------------------------------------------------------------

create table public.platform_permissions (
  key text not null
    constraint pk_platform_permissions primary key,
  "group" text not null,
  description text null,
  created_at timestamptz not null default now()
);

comment on table public.platform_permissions is
  'Catalogue of all platform permission keys.';

alter table public.platform_permissions enable row level security;

create policy "platform_permissions_select_all"
on public.platform_permissions
for select
to authenticated
using (true);

create policy "platform_permissions_insert_blocked"
on public.platform_permissions
for insert
to authenticated
with check (false);

create policy "platform_permissions_update_blocked"
on public.platform_permissions
for update
to authenticated
using (false);

create policy "platform_permissions_delete_blocked"
on public.platform_permissions
for delete
to authenticated
using (false);

-- ----------------------------------------------------------------------------
-- 3. Platform role_permissions
-- ----------------------------------------------------------------------------

create table public.platform_role_permissions (
  role_id uuid not null
    constraint fk_platform_role_permissions_role_id
    references public.platform_roles(id)
    on delete cascade,

  permission_key text not null
    constraint fk_platform_role_permissions_permission_key
    references public.platform_permissions(key)
    on delete cascade,

  constraint pk_platform_role_permissions
    primary key (role_id, permission_key)
);

comment on table public.platform_role_permissions is
  'Maps platform roles to permissions. Source of truth for platform RBAC.';

alter table public.platform_role_permissions enable row level security;

create policy "platform_role_permissions_select_all"
on public.platform_role_permissions
for select
to authenticated
using (true);

create policy "platform_role_permissions_insert_blocked"
on public.platform_role_permissions
for insert
to authenticated
with check (false);

create policy "platform_role_permissions_update_blocked"
on public.platform_role_permissions
for update
to authenticated
using (false);

create policy "platform_role_permissions_delete_blocked"
on public.platform_role_permissions
for delete
to authenticated
using (false);

-- ----------------------------------------------------------------------------
-- 4. Seed: platform permissions
-- ----------------------------------------------------------------------------

insert into public.platform_permissions (key, "group", description)
values
  ('platform.admin', 'Platform Administration', 'Full platform administrative access'),
  ('platform.members.manage', 'Platform Administration', 'Manage platform members and role assignments'),
  ('platform.audit.view', 'Platform Administration', 'View platform audit logs'),
  ('platform.orgs.manage', 'Organization Management', 'Create and manage organizations'),
  ('platform.orgs.view', 'Organization Management', 'View organizations'),
  ('platform.stores.manage', 'Store Management', 'Create and manage stores'),
  ('platform.stores.view', 'Store Management', 'View stores'),
  ('platform.provisioning.manage', 'Provisioning', 'Create, retry and cancel tenant provisioning jobs'),
  ('platform.provisioning.view', 'Provisioning', 'View tenant databases and provisioning progress'),
  ('platform.integrations.manage', 'Integrations', 'Manage store integration connections'),
  ('platform.integrations.view', 'Integrations', 'View store integration connections'),
  ('platform.billing.manage', 'Billing', 'Manage platform plans and subscriptions'),
  ('platform.billing.view', 'Billing', 'View platform billing'),
  ('platform.verification.manage', 'Verification', 'Manage store business verification requests'),
  ('platform.verification.view', 'Verification', 'View store business verification requests')
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- 5. Seed: platform roles
-- Higher rank = more authority.
-- ----------------------------------------------------------------------------

insert into public.platform_roles (
  key,
  name,
  description,
  rank,
  is_system
)
values
  ('platform_owner', 'Platform Owner', 'Full control over the Zerocraft Platform', 100, true),
  ('platform_admin', 'Platform Admin', 'Administrate the platform below the owner', 80, true),
  ('platform_reviewer', 'Platform Reviewer', 'Review store business verification requests', 60, true),
  ('platform_support', 'Platform Support', 'View platform data for support purposes', 40, true)
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- 6. Seed: platform role_permissions
-- ----------------------------------------------------------------------------

-- Platform Owner: all permissions.
insert into public.platform_role_permissions (role_id, permission_key)
select r.id, p.key
from public.platform_roles r
cross join public.platform_permissions p
where r.key = 'platform_owner'
on conflict do nothing;

-- Platform Admin.
insert into public.platform_role_permissions (role_id, permission_key)
select r.id, p.key
from public.platform_roles r
cross join public.platform_permissions p
where r.key = 'platform_admin'
  and p.key in (
    'platform.members.manage',
    'platform.audit.view',
    'platform.orgs.manage',
    'platform.orgs.view',
    'platform.stores.manage',
    'platform.stores.view',
    'platform.provisioning.manage',
    'platform.provisioning.view',
    'platform.integrations.manage',
    'platform.integrations.view',
    'platform.billing.manage',
    'platform.billing.view',
    'platform.verification.manage',
    'platform.verification.view'
  )
on conflict do nothing;

-- Platform Reviewer.
insert into public.platform_role_permissions (role_id, permission_key)
select r.id, p.key
from public.platform_roles r
cross join public.platform_permissions p
where r.key = 'platform_reviewer'
  and p.key in (
    'platform.audit.view',
    'platform.orgs.view',
    'platform.stores.view',
    'platform.verification.manage',
    'platform.verification.view'
  )
on conflict do nothing;

-- Platform Support.
insert into public.platform_role_permissions (role_id, permission_key)
select r.id, p.key
from public.platform_roles r
cross join public.platform_permissions p
where r.key = 'platform_support'
  and p.key in (
    'platform.audit.view',
    'platform.orgs.view',
    'platform.stores.view'
  )
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 7. Platform members
-- One membership per user. Separate from organization membership.
-- ----------------------------------------------------------------------------

create table public.platform_members (
  id uuid not null default gen_random_uuid()
    constraint pk_platform_members primary key,

  user_id uuid not null
    constraint fk_platform_members_user_id
    references public.platform_users(id)
    on delete cascade,

  role_id uuid not null
    constraint fk_platform_members_role_id
    references public.platform_roles(id),

  status text not null default 'active'
    constraint ck_platform_members_status
    check (status in ('invited', 'active', 'suspended')),

  invited_by uuid null
    references public.platform_users(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_platform_members_user_id unique (user_id)
);

comment on table public.platform_members is
  'Platform staff members. One membership per user. Separate from organization membership.';

-- The UNIQUE constraint on user_id already creates its index.
create index idx_platform_members_role_id
  on public.platform_members(role_id);

create index idx_platform_members_status
  on public.platform_members(status);

alter table public.platform_members enable row level security;

create policy "platform_members_select_own_or_admin"
on public.platform_members
for select
to authenticated
using (
  user_id = (select id from public.platform_users where id = auth.uid())
  or private.has_platform_permission('platform.admin')
);

create policy "platform_members_insert_blocked"
on public.platform_members
for insert
to authenticated
with check (false);

create policy "platform_members_update_blocked"
on public.platform_members
for update
to authenticated
using (false);

create policy "platform_members_delete_blocked"
on public.platform_members
for delete
to authenticated
using (false);

create trigger trg_platform_members_updated_at
before update on public.platform_members
for each row
execute function public.updated_at_trigger();

-- ============================================================================
-- End of Migration 002
-- ============================================================================
