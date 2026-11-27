
-- ============================================================================
-- Zerocraft Platform — Migration 004
-- Organization members, invitations, and membership RPCs.
--
-- Depends on:
--   Migration 001: private schema, updated_at_trigger()
--   Migration 002: platform_users
--   Migration 003: organizations and organization RBAC
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Organization members
-- ----------------------------------------------------------------------------

create table public.organization_members (
  id uuid not null default gen_random_uuid()
    constraint pk_organization_members primary key,

  organization_id uuid not null
    constraint fk_organization_members_organization_id
    references public.organizations(id)
    on delete cascade,

  user_id uuid not null
    constraint fk_organization_members_user_id
    references public.platform_users(id)
    on delete cascade,

  role_id uuid not null
    constraint fk_organization_members_role_id
    references public.organization_roles(id),

  status text not null default 'active'
    constraint ck_organization_members_status
    check (status in ('invited', 'active', 'suspended')),

  invited_by uuid null
    references public.platform_users(id),

  joined_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_organization_members_org_user
    unique (organization_id, user_id)
);

comment on table public.organization_members is
  'Links platform users to organizations with assigned roles and membership status.';

create index idx_organization_members_org_id
  on public.organization_members(organization_id);

create index idx_organization_members_user_id
  on public.organization_members(user_id);

create index idx_organization_members_status
  on public.organization_members(status);

create index idx_organization_members_role_id
  on public.organization_members(role_id);

alter table public.organization_members enable row level security;


create policy "organization_members_select_member_or_shared"
on public.organization_members
for select
to authenticated
using (
  user_id = (select id from public.platform_users where id = auth.uid())
  or organization_id in (select private.current_org_ids())
);

create policy "organization_members_insert_blocked"
on public.organization_members
for insert
to authenticated
with check (false);

create policy "organization_members_update_blocked"
on public.organization_members
for update
to authenticated
using (false);

create policy "organization_members_delete_rpc_only"
on public.organization_members
for delete
to authenticated
using (false);


-- Membership identity protection.
create or replace function public.protect_organization_members_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'organization_id cannot be changed';
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception 'user_id cannot be changed';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_organization_members_identity()
from public, anon, authenticated;

create trigger organization_members_protect_identity
before update on public.organization_members
for each row
execute function public.protect_organization_members_identity();

create trigger trg_organization_members_updated_at
before update on public.organization_members
for each row
execute function public.updated_at_trigger();


-- ----------------------------------------------------------------------------
-- 2. Organization invitations
-- ----------------------------------------------------------------------------

create table public.organization_invitations (
  id uuid not null default gen_random_uuid()
    constraint pk_organization_invitations primary key,

  organization_id uuid not null
    constraint fk_organization_invitations_organization_id
    references public.organizations(id)
    on delete cascade,

  email citext not null,

  role_id uuid not null
    constraint fk_organization_invitations_role_id
    references public.organization_roles(id),

  token_hash text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz null,
  revoked_at timestamptz null,

  invited_by uuid not null
    constraint fk_organization_invitations_invited_by
    references public.platform_users(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organization_invitations is
  'Single-use, time-bound invitations bound to email.';

comment on column public.organization_invitations.token_hash is
  'Hashed invitation token. Plaintext tokens must never be stored.';

create index idx_organization_invitations_org_email
  on public.organization_invitations(organization_id, email);

create index idx_organization_invitations_token_hash
  on public.organization_invitations(token_hash);

create index idx_organization_invitations_expires_at
  on public.organization_invitations(expires_at);

create unique index uq_organization_invitations_pending_org_email
on public.organization_invitations(organization_id, email)
where accepted_at is null
  and revoked_at is null;

revoke insert, update, delete
on public.organization_invitations
from authenticated;

alter table public.organization_invitations enable row level security;


create policy "organization_invitations_select_member"
on public.organization_invitations
for select
to authenticated
using (
  organization_id in (select private.current_org_ids())
);

create policy "organization_invitations_insert_blocked"
on public.organization_invitations
for insert
to authenticated
with check (false);

create policy "organization_invitations_update_blocked"
on public.organization_invitations
for update
to authenticated
using (false);

create policy "organization_invitations_delete_blocked"
on public.organization_invitations
for delete
to authenticated
using (false);


-- Invitation immutable fields and lifecycle protection.
create or replace function public.protect_organization_invitations_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    raise exception 'email cannot be changed';
  end if;

  if new.role_id is distinct from old.role_id then
    raise exception 'role_id cannot be changed';
  end if;

  if new.token_hash is distinct from old.token_hash then
    raise exception 'token_hash cannot be changed';
  end if;

  if new.invited_by is distinct from old.invited_by then
    raise exception 'invited_by cannot be changed';
  end if;

  if new.organization_id is distinct from old.organization_id then
    raise exception 'organization_id cannot be changed';
  end if;

  if old.accepted_at is not null
     and new.accepted_at is distinct from old.accepted_at then
    raise exception 'accepted invitation cannot be modified';
  end if;

  if old.revoked_at is not null
     and new.revoked_at is null then
    raise exception 'cannot un-revoke an invitation';
  end if;

  if new.accepted_at is not null
     and new.revoked_at is not null then
    raise exception 'invitation cannot be both accepted and revoked';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_organization_invitations_immutable()
from public, anon, authenticated;

create trigger organization_invitations_protect_immutable
before update on public.organization_invitations
for each row
execute function public.protect_organization_invitations_immutable();

create trigger trg_organization_invitations_updated_at
before update on public.organization_invitations
for each row
execute function public.updated_at_trigger();


-- ----------------------------------------------------------------------------
-- 3. RPC: private.create_organization
-- ----------------------------------------------------------------------------

create or replace function private.create_organization(
  p_name text,
  p_timezone text,
  p_currency text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
  v_owner_role_id uuid;
  v_lock_key bigint;
  v_slug text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select hashtext(auth.uid()::text)::bigint
  into v_lock_key;

  perform pg_advisory_xact_lock(v_lock_key);

  if not exists (
    select 1
    from public.platform_users
    where id = auth.uid()
  ) then
    raise exception 'Profile not found for authenticated user';
  end if;

  if exists (
    select 1
    from public.organization_members
    where user_id = auth.uid()
      and status = 'active'
  ) then
    raise exception 'User already belongs to an active organization';
  end if;

  if p_name is null
     or char_length(trim(p_name)) < 2
     or char_length(trim(p_name)) > 120 then
    raise exception 'Organization name must be between 2 and 120 characters';
  end if;

  if p_timezone is null or trim(p_timezone) = '' then
    raise exception 'Timezone is required';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_timezone_names
    where name = p_timezone
  ) then
    raise exception 'Invalid timezone';
  end if;

  if p_currency is null
     or p_currency !~ '^[A-Za-z]{3}$' then
    raise exception 'Currency must be a 3-letter ISO code';
  end if;

  select id
  into v_owner_role_id
  from public.organization_roles
  where key = 'owner'
    and is_system = true;

  if v_owner_role_id is null then
    raise exception 'Owner role not found';
  end if;

  v_org_id := gen_random_uuid();

  v_slug := trim(
    both '-'
    from regexp_replace(
      lower(trim(p_name)),
      '[^a-z0-9]+',
      '-',
      'g'
    )
  );

  if v_slug is null or v_slug = '' then
    v_slug := 'org';
  end if;

  v_slug := v_slug || '-' || replace(v_org_id::text, '-', '');

  insert into public.organizations (
    id,
    name,
    slug,
    timezone,
    currency
  )
  values (
    v_org_id,
    trim(p_name),
    v_slug,
    p_timezone,
    upper(p_currency)
  );

  insert into public.organization_members (
    organization_id,
    user_id,
    role_id,
    status,
    joined_at
  )
  values (
    v_org_id,
    auth.uid(),
    v_owner_role_id,
    'active',
    now()
  );

  return v_org_id;
end;
$$;

revoke all on function private.create_organization(text, text, text)
from public, anon;

grant execute on function private.create_organization(text, text, text)
to authenticated;


-- ----------------------------------------------------------------------------
-- 4. RPC: private.invite_member
-- ----------------------------------------------------------------------------

create or replace function private.invite_member(
  p_organization_id uuid,
  p_email text,
  p_role_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_rank int;
  v_target_role_id uuid;
  v_target_rank int;
  v_inv_id uuid;
  v_token text;

  -- IMPORTANT:
  -- Use text here because search_path is intentionally empty.
  -- The destination table column is citext.
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_email is null or trim(p_email) = '' then
    raise exception 'Email is required';
  end if;

  v_email := lower(trim(p_email));

  -- Lock organization first.
  perform 1
  from public.organizations o
  where o.id = p_organization_id
  for update of o;

  if not found then
    raise exception 'Organization not found';
  end if;

  -- Verify caller membership.
  select r.rank
  into v_caller_rank
  from public.organization_members om
  join public.organization_roles r
    on r.id = om.role_id
  where om.organization_id = p_organization_id
    and om.user_id = auth.uid()
    and om.status = 'active'
  for update of om;

  if not found then
    raise exception 'Caller is not an active member of this organization';
  end if;

  if not private.has_org_permission(
    p_organization_id,
    'users.invite'
  ) then
    raise exception 'Caller does not have invitation permission';
  end if;

  select id, rank
  into v_target_role_id, v_target_rank
  from public.organization_roles
  where key = p_role_key
    and is_system = true;

  if not found then
    raise exception 'Invalid role key';
  end if;

  if p_role_key = 'owner' then
    raise exception 'Owner role cannot be assigned through invitations';
  end if;

  if v_caller_rank <= v_target_rank then
    raise exception 'Cannot assign a role at or above caller rank';
  end if;

  -- Generate cryptographically secure token.
  v_token := encode(gen_random_bytes(32), 'hex');

  -- Revoke existing pending invitation for this email.
  update public.organization_invitations
  set revoked_at = now()
  where organization_id = p_organization_id
    and lower(email::text) = v_email
    and accepted_at is null
    and revoked_at is null;

  -- Insert invitation. PostgreSQL casts text to citext for the column.
  insert into public.organization_invitations (
    organization_id,
    email,
    role_id,
    token_hash,
    expires_at,
    invited_by
  )
  values (
    p_organization_id,
    v_email,
    v_target_role_id,
    encode(digest(v_token, 'sha256'), 'hex'),
    now() + interval '72 hours',
    auth.uid()
  )
  returning id into v_inv_id;

  return v_inv_id;
end;
$$;

revoke all on function private.invite_member(uuid, text, text)
from public, anon;

grant execute on function private.invite_member(uuid, text, text)
to authenticated;


-- ----------------------------------------------------------------------------
-- 5. RPC: private.accept_invitation
-- ----------------------------------------------------------------------------

create or replace function private.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv_id uuid;
  v_org_id uuid;
  v_role_id uuid;
  v_caller_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_token is null or trim(p_token) = '' then
    raise exception 'Invitation token is required';
  end if;

  select i.id, i.organization_id, i.role_id
  into v_inv_id, v_org_id, v_role_id
  from public.organization_invitations i
  where i.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and i.accepted_at is null
    and i.revoked_at is null
    and i.expires_at > now();

  if not found then
    raise exception 'Invalid or expired invitation';
  end if;

  -- Lock organization first.
  perform 1
  from public.organizations o
  where o.id = v_org_id
  for update of o;

  if not found then
    raise exception 'Organization not found';
  end if;

  -- Re-read and lock invitation.
  select i.id, i.organization_id, i.role_id
  into v_inv_id, v_org_id, v_role_id
  from public.organization_invitations i
  where i.id = v_inv_id
    and i.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and i.accepted_at is null
    and i.revoked_at is null
    and i.expires_at > now()
  for update of i;

  if not found then
    raise exception 'Invalid or expired invitation';
  end if;

  if not exists (
    select 1
    from public.platform_users
    where id = auth.uid()
  ) then
    raise exception 'Profile not found';
  end if;

  select u.email
  into v_caller_email
  from auth.users u
  where u.id = auth.uid();

  if v_caller_email is null then
    raise exception 'Authenticated email not found';
  end if;

  if not exists (
    select 1
    from public.organization_invitations i2
    where i2.id = v_inv_id
      and lower(i2.email::text) = lower(v_caller_email)
  ) then
    raise exception 'Invitation email does not match your account';
  end if;

  if exists (
    select 1
    from public.organization_members om
    where om.organization_id = v_org_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  ) then
    raise exception 'You are already a member of this organization';
  end if;

  update public.organization_invitations
  set accepted_at = now()
  where id = v_inv_id;

  insert into public.organization_members (
    organization_id,
    user_id,
    role_id,
    status,
    joined_at
  )
  values (
    v_org_id,
    auth.uid(),
    v_role_id,
    'active',
    now()
  )
  on conflict (organization_id, user_id)
  do update
  set status = 'active',
      role_id = excluded.role_id,
      joined_at = now(),
      updated_at = now();

  return v_org_id;
end;
$$;

revoke all on function private.accept_invitation(text)
from public, anon;

grant execute on function private.accept_invitation(text)
to authenticated;


-- ----------------------------------------------------------------------------
-- 6. RPC: private.change_member_role
-- ----------------------------------------------------------------------------

create or replace function private.change_member_role(
  p_organization_id uuid,
  p_member_id uuid,
  p_new_role_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_rank int;

  v_current_role_key text;
  v_current_target_rank int;
  v_target_member_id uuid;

  v_new_role_id uuid;
  v_new_role_rank int;
begin
  if v_caller_id is null then
    raise exception 'Authentication required';
  end if;

  perform 1
  from public.organizations o
  where o.id = p_organization_id
  for update of o;

  if not found then
    raise exception 'Organization not found';
  end if;

  select r.rank
  into v_caller_rank
  from public.organization_members om
  join public.organization_roles r
    on r.id = om.role_id
  where om.organization_id = p_organization_id
    and om.user_id = v_caller_id
    and om.status = 'active'
  for update of om;

  if not found then
    raise exception 'Caller is not an active member of this organization';
  end if;

  if not private.has_org_permission(
    p_organization_id,
    'users.manage_roles'
  ) then
    raise exception 'Caller does not have role management permission';
  end if;

  select r.key, r.rank, om.user_id
  into v_current_role_key, v_current_target_rank, v_target_member_id
  from public.organization_members om
  join public.organization_roles r
    on r.id = om.role_id
  where om.id = p_member_id
    and om.organization_id = p_organization_id
  for update of om;

  if not found then
    raise exception 'Membership not found in this organization';
  end if;

  if v_target_member_id = v_caller_id then
    raise exception 'Cannot change your own role';
  end if;

  if v_current_role_key = 'owner' then
    raise exception 'Cannot change the role of an Owner through role management';
  end if;

  if p_new_role_key = 'owner' then
    raise exception 'Owner role cannot be assigned through role management';
  end if;

  if v_caller_rank <= v_current_target_rank then
    raise exception 'Cannot change the role of a member with rank equal to or higher than caller';
  end if;

  select id, rank
  into v_new_role_id, v_new_role_rank
  from public.organization_roles
  where key = p_new_role_key
    and is_system = true;

  if not found then
    raise exception 'Invalid role key';
  end if;

  if v_caller_rank <= v_new_role_rank then
    raise exception 'Cannot assign a role with rank equal to or higher than caller';
  end if;

  update public.organization_members
  set role_id = v_new_role_id,
      updated_at = now()
  where id = p_member_id;
end;
$$;

revoke all on function private.change_member_role(uuid, uuid, text)
from public, anon;

grant execute on function private.change_member_role(uuid, uuid, text)
to authenticated;


-- ----------------------------------------------------------------------------
-- 7. Public RPC wrappers
-- ----------------------------------------------------------------------------

create or replace function public.create_organization(
  p_name text,
  p_timezone text,
  p_currency text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.create_organization(
    p_name,
    p_timezone,
    p_currency
  );
end;
$$;

revoke all on function public.create_organization(text, text, text)
from public, anon;

grant execute on function public.create_organization(text, text, text)
to authenticated;


create or replace function public.invite_member(
  p_organization_id uuid,
  p_email text,
  p_role_key text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.invite_member(
    p_organization_id,
    p_email,
    p_role_key
  );
end;
$$;

revoke all on function public.invite_member(uuid, text, text)
from public, anon;

grant execute on function public.invite_member(uuid, text, text)
to authenticated;


create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.accept_invitation(p_token);
end;
$$;

revoke all on function public.accept_invitation(text)
from public, anon;

grant execute on function public.accept_invitation(text)
to authenticated;


create or replace function public.change_member_role(
  p_organization_id uuid,
  p_member_id uuid,
  p_new_role_key text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.change_member_role(
    p_organization_id,
    p_member_id,
    p_new_role_key
  );
end;
$$;

revoke all on function public.change_member_role(uuid, uuid, text)
from public, anon;

grant execute on function public.change_member_role(uuid, uuid, text)
to authenticated;


-- ----------------------------------------------------------------------------
-- 8. Prevent deletion of users who own organizations
-- ----------------------------------------------------------------------------

create or replace function private.prevent_owner_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_count int;
begin
  select count(*)
  into v_owner_count
  from public.organization_members om
  join public.organization_roles orl
    on orl.id = om.role_id
  where om.user_id = old.id
    and om.status = 'active'
    and orl.key = 'owner';

  if v_owner_count > 0 then
    raise exception
      'Cannot delete user who is an active owner of % organization(s). Transfer ownership first.',
      v_owner_count;
  end if;

  return old;
end;
$$;

revoke all on function private.prevent_owner_deletion()
from public, anon, authenticated;

create trigger trg_prevent_owner_deletion
before delete on public.platform_users
for each row
execute function private.prevent_owner_deletion();


-- ============================================================================
-- End of Migration 004
-- ============================================================================
