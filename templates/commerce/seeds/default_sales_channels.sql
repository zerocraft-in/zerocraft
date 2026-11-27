-- ============================================================================
-- Seed: default_sales_channels
-- Creates public.seed_tenant_channels(store_id). Idempotent.
-- ============================================================================

create or replace function public.seed_tenant_channels(p_store_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.stores where id = p_store_id) then
    raise exception 'store % not found', p_store_id;
  end if;

  insert into public.sales_channels (store_id, name, slug, kind, status)
  values
    (p_store_id, 'Online store', 'online-store', 'online_store', 'active'),
    (p_store_id, 'Point of sale', 'pos', 'pos', 'active')
  on conflict (store_id, slug) do nothing;
end;
$$;

revoke all on function public.seed_tenant_channels(uuid) from public, anon, authenticated;
grant execute on function public.seed_tenant_channels(uuid) to service_role;
