-- ============================================================================
-- Verification: rls-verification
-- Confirms RLS is enabled, client roles cannot bypass it, and write privileges
-- on ledgers and internal tables are revoked.
-- ============================================================================

do $$
declare
  r record;
  missing_rls text[] := '{}';
  writable_ledger text[] := '{}';
  anon_policies text[] := '{}';
begin
  -- 1. Every public table has RLS enabled.
  for r in
    select tablename from pg_tables where schemaname = 'public'
  loop
    if not exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = r.tablename and c.relrowsecurity
    ) then
      missing_rls := missing_rls || r.tablename;
    end if;
  end loop;

  if cardinality(missing_rls) > 0 then
    raise exception 'RLS not enabled on: %', array_to_string(missing_rls, ', ');
  end if;

  -- 2. No policy may target anon or public.
  select coalesce(array_agg(policyname), '{}')
    into anon_policies
  from pg_policies
  where schemaname = 'public'
    and ('anon' = any(roles) or 'public' = any(roles));

  if cardinality(anon_policies) > 0 then
    raise exception 'policies grant anon/public access: %', array_to_string(anon_policies, ', ');
  end if;

  -- 3. Ledgers must not have INSERT/UPDATE/DELETE policies for authenticated.
  for r in
    select unnest(array[
      'audit_logs', 'inventory_movements', 'payment_events',
      'pos_cash_movements', 'webhook_deliveries'
    ]) as tablename
  loop
    if exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = r.tablename
        and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    ) then
      writable_ledger := writable_ledger || r.tablename;
    end if;
  end loop;

  if cardinality(writable_ledger) > 0 then
    raise exception 'ledger tables have write policies: %', array_to_string(writable_ledger, ', ');
  end if;

  -- 4. Client table privileges for ledgers are revoked.
  if has_table_privilege('authenticated', 'public.audit_logs', 'INSERT')
     or has_table_privilege('authenticated', 'public.audit_logs', 'UPDATE')
     or has_table_privilege('authenticated', 'public.audit_logs', 'DELETE') then
    raise exception 'authenticated retains write privileges on audit_logs';
  end if;

  if has_table_privilege('authenticated', 'public.inventory_movements', 'INSERT') then
    raise exception 'authenticated can insert into inventory_movements';
  end if;

  if has_table_privilege('authenticated', 'public.commerce_template_migrations', 'SELECT') then
    raise exception 'authenticated can read the template migration ledger';
  end if;

  if has_table_privilege('authenticated', 'public.outbox_events', 'SELECT') then
    raise exception 'authenticated can read the outbox';
  end if;

  -- 5. Tenant members can only address rows in stores they may access: the
  -- policy expression must reference can_access_store at least once per
  -- store-scoped policy set.
  for r in
    select tablename from pg_tables where schemaname = 'public'
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = r.tablename and column_name = 'store_id'
    ) then
      if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = r.tablename
          and qual like '%can_access_store%'
      ) then
        raise exception 'store-scoped table public.% has no store policy', r.tablename;
      end if;
    end if;
  end loop;

  raise notice 'rls-verification passed';
end;
$$;
