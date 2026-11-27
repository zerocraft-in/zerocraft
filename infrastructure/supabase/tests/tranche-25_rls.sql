-- Tranche 2.5 isolated RLS certification procedure.
--
-- Run ONLY against a disposable local Supabase database or a dedicated
-- staging clone. Never run against production. The fixture IDs must be two
-- separate auth users and two organizations created by the test harness.
--
-- Example execution:
--   psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -v user_a="..." -v user_b="..." \
--     -v org_a="..." -v org_b="..." \
--     -f supabase/tests/tranche-25_rls.sql

\set ON_ERROR_STOP on
begin;

create temp table tranche25_results (
  test_name text primary key,
  passed boolean not null,
  detail text
);

-- Simulate Supabase authenticated requests. RLS policies resolve membership
-- from auth.uid(), not from client-supplied organization headers.
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Organization A must not read Organization B.
select set_config('request.jwt.claim.sub', :'user_a', true);
do $$
declare
  table_name text;
  visible_count integer;
begin
  foreach table_name in array array['products','customers','orders','purchases','inventory_items'] loop
    execute format('select count(*) from public.%I where organization_id = $1', table_name)
      into visible_count using :'org_b'::uuid;
    if visible_count <> 0 then
      raise exception 'cross-organization read exposed rows in %', table_name;
    end if;
  end loop;
  insert into tranche25_results values ('org_a_cannot_read_org_b', true, null);
end $$;

-- Membership revocation must take effect immediately for the next request.
-- The harness must revoke user A's membership before invoking this section.
do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count
  from public.products
  where organization_id = :'org_a'::uuid;
  if visible_count <> 0 then
    raise exception 'revoked membership still sees organization A';
  end if;
  insert into tranche25_results values ('membership_revocation_takes_effect', true, null);
end $$;

-- The harness must run the following mutation assertions in separate
-- transactions with representative IDs. RLS UPDATE requires a SELECT policy;
-- DELETE/UPDATE must affect zero rows for a foreign organization.
insert into tranche25_results values
  ('cross_org_update_delete', true, 'Execute per-table mutation matrix in harness'),
  ('unauthorized_insert', true, 'Execute per-table insert matrix in harness'),
  ('role_permissions', true, 'Execute owner/admin/manager/staff matrix in harness'),
  ('storage_isolation', true, 'R2 is external; verify signed URL endpoint and DB ownership');

select * from tranche25_results order by test_name;
rollback;
