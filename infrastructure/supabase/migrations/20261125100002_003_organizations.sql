
-- ============================================================================
-- Zerocraft Platform — Migration 003
-- Organizations, organization-scoped helpers, organization RBAC.
--
-- Dependencies:
--   Migration 001: private schema, updated_at_trigger()
--   Migration 002: platform_users
--
-- organization_members and organization_invitations are created in migration
-- 004. Membership-dependent PL/pgSQL helpers defer relation resolution until
-- execution time, after migration 004 has created organization_members.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Organization-scoped helpers
-- ----------------------------------------------------------------------------

-- Returns organization IDs where the authenticated user has active membership.
create or replace function private.current_org_ids()
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select om.organization_id
  from public.organization_members om
  where om.user_id = auth.uid()
    and om.status = 'active';
end;
$$;

revoke all on function private.current_org_ids() from public, anon;
grant execute on function private.current_org_ids() to authenticated;


-- Returns organization IDs where the authenticated user has a permission.
create or replace function private.authorized_org_ids(p_permission text)
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select om.organization_id
  from public.organization_members om
  join public.organization_roles orl
    on orl.id = om.role_id
  join public.organization_role_permissions orp
    on orp.role_id = orl.id
  join public.organization_permissions op
    on op.key = orp.permission_key
  where om.user_id = auth.uid()
    and om.status = 'active'
    and op.key = p_permission;
end;
$$;

revoke all on function private.authorized_org_ids(text) from public, anon;
grant execute on function private.authorized_org_ids(text) to authenticated;


-- Checks whether the authenticated user has a permission in an organization.
create or replace function private.has_org_permission(
  p_org uuid,
  p_permission text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1
    from public.organization_members om
    join public.organization_roles orl
      on orl.id = om.role_id
    join public.organization_role_permissions orp
      on orp.role_id = orl.id
    join public.organization_permissions op
      on op.key = orp.permission_key
    where om.user_id = auth.uid()
      and om.organization_id = p_org
      and om.status = 'active'
      and op.key = p_permission
  );
end;
$$;

revoke all on function private.has_org_permission(uuid, text) from public, anon;
grant execute on function private.has_org_permission(uuid, text) to authenticated;


-- Checks whether the authenticated user is an active member.
create or replace function private.is_org_member(p_org uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id = p_org
      and om.status = 'active'
  );
end;
$$;

revoke all on function private.is_org_member(uuid) from public, anon;
grant execute on function private.is_org_member(uuid) to authenticated;


-- Checks whether the authenticated user is an active organization owner.
create or replace function private.is_org_owner(p_org uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1
    from public.organization_members om
    join public.organization_roles orl
      on orl.id = om.role_id
    where om.organization_id = p_org
      and om.user_id = auth.uid()
      and om.status = 'active'
      and orl.key = 'owner'
  );
end;
$$;

revoke all on function private.is_org_owner(uuid) from public, anon;
grant execute on function private.is_org_owner(uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- 1. Organizations
-- ----------------------------------------------------------------------------

create table public.organizations (
  id uuid not null default gen_random_uuid()
    constraint pk_organizations primary key,

  name text not null
    check (char_length(trim(name)) between 2 and 120),

  slug text not null unique
    check (slug ~ '^[a-z0-9-]+$'),

  currency char(3) not null default 'INR',
  timezone text not null default 'Asia/Kolkata',
  country char(2) not null default 'IN',

  gstin text null,
  address jsonb null,
  phone text null,
  email text null,
  logo_path text null,

  invoice_prefix text not null default 'INV-',
  invoice_next_number int not null default 1
    check (invoice_next_number > 0),

  tax_inclusive_pricing boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organizations is
  'Top-level tenant. Every business record is organization-scoped.';

comment on column public.organizations.slug is
  'URL-safe unique identifier, lowercase [a-z0-9-].';

alter table public.organizations enable row level security;

create policy "organizations_select_member"
on public.organizations
for select
to authenticated
using (
  id in (select private.current_org_ids())
);

create policy "organizations_insert_blocked"
on public.organizations
for insert
to authenticated
with check (false);

create policy "organizations_update_blocked"
on public.organizations
for update
to authenticated
using (false);

create policy "organizations_delete_blocked"
on public.organizations
for delete
to authenticated
using (false);

create trigger trg_organizations_updated_at
before update on public.organizations
for each row
execute function public.updated_at_trigger();


-- ----------------------------------------------------------------------------
-- 2. Organization roles
-- ----------------------------------------------------------------------------

create table public.organization_roles (
  id uuid not null default gen_random_uuid()
    constraint pk_organization_roles primary key,

  key text not null unique
    constraint ck_organization_roles_key
    check (key in ('owner', 'admin', 'manager', 'staff')),

  name text not null,

  rank int not null default 0
    constraint ck_organization_roles_rank
    check (rank >= 0),

  is_system boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organization_roles is
  'System organization roles ordered by rank. Owner = highest rank.';

comment on column public.organization_roles.rank is
  'Used to prevent privilege escalation. Owner = highest.';

comment on column public.organization_roles.is_system is
  'System roles cannot be deleted by clients.';

alter table public.organization_roles enable row level security;

create policy "organization_roles_select_all"
on public.organization_roles
for select
to authenticated
using (true);

create policy "organization_roles_insert_blocked"
on public.organization_roles
for insert
to authenticated
with check (false);

create policy "organization_roles_update_blocked"
on public.organization_roles
for update
to authenticated
using (false);

create policy "organization_roles_delete_blocked"
on public.organization_roles
for delete
to authenticated
using (false);

create trigger trg_organization_roles_updated_at
before update on public.organization_roles
for each row
execute function public.updated_at_trigger();


-- ----------------------------------------------------------------------------
-- 3. Organization permissions
-- ----------------------------------------------------------------------------

create table public.organization_permissions (
  key text not null
    constraint pk_organization_permissions primary key,

  "group" text not null,
  description text null,

  created_at timestamptz not null default now()
);

comment on table public.organization_permissions is
  'Catalogue of all organization permission keys.';

alter table public.organization_permissions enable row level security;

create policy "organization_permissions_select_all"
on public.organization_permissions
for select
to authenticated
using (true);

create policy "organization_permissions_insert_blocked"
on public.organization_permissions
for insert
to authenticated
with check (false);

create policy "organization_permissions_update_blocked"
on public.organization_permissions
for update
to authenticated
using (false);

create policy "organization_permissions_delete_blocked"
on public.organization_permissions
for delete
to authenticated
using (false);


-- ----------------------------------------------------------------------------
-- 4. Organization role_permissions
-- ----------------------------------------------------------------------------

create table public.organization_role_permissions (
  role_id uuid not null
    constraint fk_organization_role_permissions_role_id
    references public.organization_roles(id)
    on delete cascade,

  permission_key text not null
    constraint fk_organization_role_permissions_permission_key
    references public.organization_permissions(key)
    on delete cascade,

  constraint pk_organization_role_permissions
    primary key (role_id, permission_key)
);

comment on table public.organization_role_permissions is
  'Maps organization roles to permissions.';

alter table public.organization_role_permissions enable row level security;

create policy "organization_role_permissions_select_all"
on public.organization_role_permissions
for select
to authenticated
using (true);

create policy "organization_role_permissions_insert_blocked"
on public.organization_role_permissions
for insert
to authenticated
with check (false);

create policy "organization_role_permissions_update_blocked"
on public.organization_role_permissions
for update
to authenticated
using (false);

create policy "organization_role_permissions_delete_blocked"
on public.organization_role_permissions
for delete
to authenticated
using (false);


-- ----------------------------------------------------------------------------
-- 5. Seed: organization permissions
-- ----------------------------------------------------------------------------

insert into public.organization_permissions (
  key,
  "group",
  description
)
values
  ('organizations.view', 'Administration', 'View organization details'),
  ('organizations.manage', 'Administration', 'Manage organization settings'),
  ('users.view', 'Administration', 'View organization members'),
  ('users.invite', 'Administration', 'Invite new members'),
  ('users.manage_roles', 'Administration', 'Change member roles and deactivate members'),
  ('audit_logs.view', 'Administration', 'View organization audit logs'),
  ('stores.view', 'Store Management', 'View stores'),
  ('stores.manage', 'Store Management', 'Create and manage stores')
on conflict (key) do nothing;


-- ----------------------------------------------------------------------------
-- 6. Seed: organization roles
-- Owner = 100, Admin = 80, Manager = 60, Staff = 20.
-- ----------------------------------------------------------------------------

insert into public.organization_roles (
  key,
  name,
  rank,
  is_system
)
values
  ('owner', 'Owner', 100, true),
  ('admin', 'Admin', 80, true),
  ('manager', 'Manager', 60, true),
  ('staff', 'Staff', 20, true)
on conflict (key) do nothing;


-- ----------------------------------------------------------------------------
-- 7. Seed: organization role_permissions
-- ----------------------------------------------------------------------------

-- Owner: every permission.
insert into public.organization_role_permissions (
  role_id,
  permission_key
)
select r.id, p.key
from public.organization_roles r
cross join public.organization_permissions p
where r.key = 'owner'
on conflict do nothing;


-- Admin.
insert into public.organization_role_permissions (
  role_id,
  permission_key
)
select r.id, p.key
from public.organization_roles r
cross join public.organization_permissions p
where r.key = 'admin'
  and p.key in (
    'organizations.view',
    'organizations.manage',
    'users.view',
    'users.invite',
    'users.manage_roles',
    'audit_logs.view',
    'stores.view',
    'stores.manage'
  )
on conflict do nothing;


-- Manager.
insert into public.organization_role_permissions (
  role_id,
  permission_key
)
select r.id, p.key
from public.organization_roles r
cross join public.organization_permissions p
where r.key = 'manager'
  and p.key in (
    'organizations.view',
    'users.view',
    'audit_logs.view',
    'stores.view'
  )
on conflict do nothing;


-- Staff.
insert into public.organization_role_permissions (
  role_id,
  permission_key
)
select r.id, p.key
from public.organization_roles r
cross join public.organization_permissions p
where r.key = 'staff'
  and p.key in (
    'organizations.view',
    'stores.view'
  )
on conflict do nothing;


-- ============================================================================
-- End of Migration 003
-- ============================================================================
