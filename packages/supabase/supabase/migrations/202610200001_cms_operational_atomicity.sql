-- CMS operational write hardening.
-- Keeps category assignment and inventory adjustment internally consistent.

create or replace function public.studio_assign_products_to_category(
  p_category_id uuid,
  p_subcategory_id uuid,
  p_product_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_product_count integer;
begin
  if not public.is_studio_member() then
    raise exception using errcode = '42501', message = 'Studio access required.';
  end if;

  if not exists (select 1 from public.store_categories where id = p_category_id) then
    raise exception using errcode = 'P0002', message = 'CATEGORY_NOT_FOUND';
  end if;

  if p_subcategory_id is not null and not exists (
    select 1
    from public.store_subcategories
    where id = p_subcategory_id and category_id = p_category_id
  ) then
    raise exception using errcode = 'P0002', message = 'SUBCATEGORY_NOT_FOUND';
  end if;

  select count(*) into v_product_count
  from public.store_products
  where id = any(coalesce(p_product_ids, '{}'::uuid[]));

  if v_product_count <> coalesce(cardinality(p_product_ids), 0) then
    raise exception using errcode = 'P0002', message = 'PRODUCT_NOT_FOUND';
  end if;

  if p_subcategory_id is null then
    update public.store_products
    set category_id = null, subcategory_id = null, updated_at = now()
    where category_id = p_category_id
      and id <> all(coalesce(p_product_ids, '{}'::uuid[]));
  else
    update public.store_products
    set subcategory_id = null, updated_at = now()
    where subcategory_id = p_subcategory_id
      and id <> all(coalesce(p_product_ids, '{}'::uuid[]));
  end if;

  update public.store_products
  set category_id = p_category_id,
      subcategory_id = p_subcategory_id,
      updated_at = now()
  where id = any(coalesce(p_product_ids, '{}'::uuid[]));
end;
$$;

revoke all on function public.studio_assign_products_to_category(uuid, uuid, uuid[]) from public, anon;
grant execute on function public.studio_assign_products_to_category(uuid, uuid, uuid[]) to authenticated;

create or replace function public.studio_adjust_inventory(
  p_location_id uuid,
  p_variant_id uuid,
  p_on_hand integer,
  p_reorder_point integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current public.store_inventory_levels%rowtype;
  v_delta integer;
begin
  if not public.is_studio_member() then
    raise exception using errcode = '42501', message = 'Studio access required.';
  end if;

  if p_on_hand < 0 or p_reorder_point < 0 then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;

  select * into v_current
  from public.store_inventory_levels
  where location_id = p_location_id and variant_id = p_variant_id
  for update;

  if not found then
    v_current.on_hand := 0;
    v_current.reserved := 0;
  end if;

  if p_on_hand < coalesce(v_current.reserved, 0) then
    raise exception using errcode = 'P0001', message = 'INVENTORY_RESERVED';
  end if;

  v_delta := p_on_hand - coalesce(v_current.on_hand, 0);

  insert into public.store_inventory_levels(
    location_id, variant_id, on_hand, reserved, reorder_point, updated_at
  ) values (
    p_location_id, p_variant_id, p_on_hand, coalesce(v_current.reserved, 0), p_reorder_point, now()
  )
  on conflict (location_id, variant_id) do update set
    on_hand = excluded.on_hand,
    reserved = excluded.reserved,
    reorder_point = excluded.reorder_point,
    updated_at = excluded.updated_at;

  if v_delta <> 0 then
    insert into public.store_inventory_movements(
      location_id, variant_id, quantity_delta, reason, created_by
    ) values (
      p_location_id, p_variant_id, v_delta, 'studio_adjustment', (select auth.uid())
    );
  end if;

  return jsonb_build_object(
    'location_id', p_location_id,
    'variant_id', p_variant_id,
    'on_hand', p_on_hand,
    'reserved', coalesce(v_current.reserved, 0),
    'reorder_point', p_reorder_point,
    'updated_at', now()
  );
end;
$$;

revoke all on function public.studio_adjust_inventory(uuid, uuid, integer, integer) from public, anon;
grant execute on function public.studio_adjust_inventory(uuid, uuid, integer, integer) to authenticated;
