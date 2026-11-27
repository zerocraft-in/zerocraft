-- ============================================================================
-- Verification: tenant-isolation
-- Proves store isolation and permission gating with real RLS enforcement.
--
-- Runs entirely inside a transaction that is rolled back. It creates only
-- fixture rows (never auth.users) and uses a signed-claim simulation through
-- request.jwt.claims plus the `authenticated` role.
--
-- Preconditions: Supabase-compatible database where roles `authenticated` and
-- `service_role` exist. Do not run against a customer's live project without a
-- transaction and a reviewed plan.
-- ============================================================================

begin;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    raise exception 'role authenticated does not exist; run against a Supabase-compatible database';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Fixtures (as the migration owner; RLS bypassed by ownership/superuser).
-- ----------------------------------------------------------------------------
insert into public.roles (key, name, rank, is_system)
values ('owner', 'Owner', 100, true), ('staff', 'Staff', 20, true)
on conflict (key) do nothing;

insert into public.permissions (key, "group") values
  ('products.view', 'catalog'), ('products.manage', 'catalog')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join public.permissions p
where r.key = 'owner' and p.key in ('products.view', 'products.manage')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join public.permissions p
where r.key = 'staff' and p.key = 'products.view'
on conflict do nothing;

insert into public.stores (id, central_store_ref, name, slug, is_default)
values
  ('11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Store A', 'store-a', true),
  ('22222222-2222-4222-8222-222222222222',
   'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Store B', 'store-b', false);

insert into public.tenant_context
  (id, organization_id, organization_name, central_store_id, store_id,
   template_version, platform_issuer, platform_audience, initialized_at)
values
  (1, '33333333-3333-4333-8333-333333333333', 'Test Organization',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111',
   '1.0.0', 'https://platform.zerocraft.test', 'commerce', now());

insert into public.tenant_members
  (id, central_user_id, email, display_name, role_id, status, all_stores)
select '44444444-4444-4444-8444-444444444444',
       '55555555-5555-4555-8555-555555555555',
       'owner-a@example.test', 'Owner A', r.id, 'active', false
from public.roles r where r.key = 'owner';

insert into public.tenant_members
  (id, central_user_id, email, display_name, role_id, status, all_stores)
select '66666666-6666-4666-8666-666666666666',
       '77777777-7777-4777-8777-777777777777',
       'staff-b@example.test', 'Staff B', r.id, 'active', false
from public.roles r where r.key = 'staff';

insert into public.tenant_member_stores (member_id, store_id) values
  ('44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111'),
  ('66666666-6666-4666-8666-666666666666', '22222222-2222-4222-8222-222222222222');

insert into public.products (id, store_id, title, handle, status)
values
  ('88888888-8888-4888-8888-888888888888',
   '11111111-1111-4111-8111-111111111111', 'Product A', 'product-a', 'active'),
  ('99999999-9999-4999-8999-999999999999',
   '22222222-2222-4222-8222-222222222222', 'Product B', 'product-b', 'active');

-- ----------------------------------------------------------------------------
-- Member A: owner scoped to Store A.
-- ----------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '55555555-5555-4555-8555-555555555555',
    'iss', 'https://platform.zerocraft.test',
    'aud', 'commerce'
  )::text,
  true
);
set local role authenticated;

do $$
declare
  v_count integer;
  v_titles text[];
  v_blocked boolean := false;
begin
  if private.current_member_id() is distinct from '44444444-4444-4444-8444-444444444444'::uuid then
    raise exception 'member A identity resolution failed';
  end if;

  select count(*), array_agg(title order by title)
    into v_count, v_titles
  from public.products;

  if v_count <> 1 or v_titles <> array['Product A'] then
    raise exception 'member A sees % rows: %', v_count, v_titles;
  end if;

  if not private.can_access_store('11111111-1111-4111-8111-111111111111') then
    raise exception 'member A cannot access own store';
  end if;

  if private.can_access_store('22222222-2222-4222-8222-222222222222') then
    raise exception 'member A can access store B';
  end if;

  -- Cross-store insert must be rejected by RLS.
  begin
    insert into public.products (store_id, title, handle)
    values ('22222222-2222-4222-8222-222222222222', 'Leak', 'leak');
  exception when insufficient_privilege then
    v_blocked := true;
  end;

  if not v_blocked then
    raise exception 'cross-store insert succeeded for member A';
  end if;

  -- Audit rows for Store B must be invisible.
  if exists (select 1 from public.audit_logs
             where store_id = '22222222-2222-4222-8222-222222222222') then
    raise exception 'member A can read Store B audit rows';
  end if;
end;
$$;

reset role;

-- ----------------------------------------------------------------------------
-- Member B: staff scoped to Store B (read-only catalog).
-- ----------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '77777777-7777-4777-8777-777777777777',
    'iss', 'https://platform.zerocraft.test',
    'aud', 'commerce'
  )::text,
  true
);
set local role authenticated;

do $$
declare
  v_count integer;
  v_titles text[];
  v_blocked boolean := false;
begin
  select count(*), array_agg(title order by title)
    into v_count, v_titles
  from public.products;

  if v_count <> 1 or v_titles <> array['Product B'] then
    raise exception 'member B sees % rows: %', v_count, v_titles;
  end if;

  -- Staff has products.view but not products.manage.
  begin
    insert into public.products (store_id, title, handle)
    values ('22222222-2222-4222-8222-222222222222', 'Staff product', 'staff-product');
  exception when insufficient_privilege then
    v_blocked := true;
  end;

  if not v_blocked then
    raise exception 'staff insert was allowed without products.manage';
  end if;
end;
$$;

reset role;

-- ----------------------------------------------------------------------------
-- Untrusted issuer must not resolve an identity.
-- ----------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '55555555-5555-4555-8555-555555555555',
    'iss', 'https://evil.example.test',
    'aud', 'commerce'
  )::text,
  true
);
set local role authenticated;

do $$
begin
  if private.current_member_id() is not null then
    raise exception 'identity resolved for an untrusted issuer';
  end if;

  if exists (select 1 from public.products) then
    raise exception 'rows visible without a trusted identity';
  end if;
end;
$$;

reset role;

rollback;

select 'tenant-isolation passed' as result;
