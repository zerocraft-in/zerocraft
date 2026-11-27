-- ============================================================================
-- Verification: health-verification
-- Runs after initialize_tenant. Fails closed if the tenant is not initialized
-- or any public table is missing RLS.
-- ============================================================================

do $$
declare
  v_health jsonb;
  v_missing jsonb;
begin
  if not exists (select 1 from public.tenant_context where id = 1) then
    raise exception 'tenant_context is not initialized';
  end if;

  if not exists (
    select 1 from public.tenant_members
    where status = 'active'
      and role_id = (select id from public.roles where key = 'owner')
  ) then
    raise exception 'no active owner tenant member';
  end if;

  if not exists (select 1 from public.stores where is_default) then
    raise exception 'no default store';
  end if;

  if not exists (select 1 from public.locations where is_default) then
    raise exception 'no default location; seed_tenant_defaults did not run';
  end if;

  if not exists (select 1 from public.sales_channels) then
    raise exception 'no sales channels; seed_tenant_channels did not run';
  end if;

  v_health := public.commerce_template_health();
  v_missing := coalesce(v_health -> 'tables_without_rls', '[]'::jsonb);

  if jsonb_array_length(v_missing) > 0 then
    raise exception 'tables without RLS: %', v_missing::text;
  end if;

  if (v_health ->> 'roles')::integer < 5 then
    raise exception 'default roles missing: %', v_health ->> 'roles';
  end if;

  raise notice 'health-verification passed: %', v_health::text;
end;
$$;
