-- ============================================================================
-- Seed: default_settings
-- Creates public.seed_tenant_defaults(store_id), which the provisioning Worker
-- calls (through initialize_tenant) after the tenant is initialized.
-- Idempotent: safe to re-run.
-- ============================================================================

create or replace function public.seed_tenant_defaults(p_store_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_currency char(3);
  v_timezone text;
  v_profile_id uuid;
  v_zone_id uuid;
begin
  select currency, timezone into v_currency, v_timezone
  from public.stores where id = p_store_id;

  if not found then
    raise exception 'store % not found', p_store_id;
  end if;

  insert into public.tenant_settings (store_id, currency, timezone)
  values (p_store_id, v_currency, v_timezone)
  on conflict (store_id) do nothing;

  insert into public.locations (store_id, name, code, kind, is_default, fulfills_online_orders)
  values (p_store_id, 'Main location', 'MAIN', 'retail', true, true)
  on conflict (store_id, code) do nothing;

  insert into public.pos_settings (store_id, receipt_header, receipt_footer)
  values (p_store_id, 'Thank you for your purchase', 'Powered by Zerocraft')
  on conflict (store_id) do nothing;

  insert into public.shipping_profiles (store_id, name, is_default)
  values (p_store_id, 'Default shipping profile', true)
  on conflict (store_id, name) do nothing;

  select id into v_profile_id
  from public.shipping_profiles
  where store_id = p_store_id and name = 'Default shipping profile';

  if v_profile_id is not null then
    insert into public.shipping_zones (store_id, profile_id, name, countries)
    values (p_store_id, v_profile_id, 'Domestic', array['IN'])
    on conflict do nothing;

    select id into v_zone_id
    from public.shipping_zones
    where store_id = p_store_id and name = 'Domestic' and profile_id = v_profile_id;

    if v_zone_id is not null then
      insert into public.shipping_rates (store_id, zone_id, name, rate_paise)
      select p_store_id, v_zone_id, 'Standard', 0
      where not exists (
        select 1 from public.shipping_rates
        where store_id = p_store_id and zone_id = v_zone_id and name = 'Standard'
      );
    end if;
  end if;
end;
$$;

revoke all on function public.seed_tenant_defaults(uuid) from public, anon, authenticated;
grant execute on function public.seed_tenant_defaults(uuid) to service_role;
