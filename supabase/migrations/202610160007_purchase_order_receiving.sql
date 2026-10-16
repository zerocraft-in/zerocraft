create or replace function public.studio_receive_purchase_order(p_order_id uuid, p_receipts jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.store_purchase_orders%rowtype;
  v_receipt record;
  v_item public.store_purchase_order_items%rowtype;
  v_level public.store_inventory_levels%rowtype;
  v_total integer;
  v_received integer;
begin
  if not public.is_studio_member() then
    raise exception using errcode = '42501', message = 'Studio access required.';
  end if;
  if jsonb_typeof(coalesce(p_receipts, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'Receipts must be an array.';
  end if;
  select * into v_order from public.store_purchase_orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Purchase order not found.'; end if;
  if v_order.status in ('cancelled','received') then
    raise exception using errcode = 'P0001', message = 'This purchase order cannot receive more stock.';
  end if;
  for v_receipt in select * from jsonb_to_recordset(p_receipts) as x(item_id uuid, quantity integer) loop
    if v_receipt.quantity is null or v_receipt.quantity <= 0 then
      raise exception using errcode = '22023', message = 'Received quantity must be positive.';
    end if;
    select * into v_item from public.store_purchase_order_items where id = v_receipt.item_id and purchase_order_id = p_order_id for update;
    if not found then raise exception using errcode = 'P0002', message = 'Purchase order item not found.'; end if;
    if v_item.quantity_received + v_receipt.quantity > v_item.quantity_ordered then
      raise exception using errcode = '22023', message = 'Received quantity cannot exceed ordered quantity.';
    end if;
    update public.store_purchase_order_items set quantity_received = quantity_received + v_receipt.quantity where id = v_item.id;
    select * into v_level from public.store_inventory_levels where location_id = v_order.location_id and variant_id = v_item.variant_id for update;
    if found then
      update public.store_inventory_levels set on_hand = on_hand + v_receipt.quantity, updated_at = now() where location_id = v_order.location_id and variant_id = v_item.variant_id;
    else
      insert into public.store_inventory_levels(location_id, variant_id, on_hand, reserved, reorder_point) values (v_order.location_id, v_item.variant_id, v_receipt.quantity, 0, 0);
    end if;
    insert into public.store_inventory_movements(location_id, variant_id, quantity_delta, reason, reference_type, reference_id, created_by)
      values (v_order.location_id, v_item.variant_id, v_receipt.quantity, 'purchase_order_receipt', 'purchase_order', p_order_id, auth.uid());
  end loop;
  select coalesce(sum(quantity_ordered), 0), coalesce(sum(quantity_received), 0) into v_total, v_received from public.store_purchase_order_items where purchase_order_id = p_order_id;
  update public.store_purchase_orders set status = case when v_received >= v_total then 'received' when v_received > 0 then 'partial' else status end, updated_at = now() where id = p_order_id;
  return jsonb_build_object('order_id', p_order_id, 'status', case when v_received >= v_total then 'received' when v_received > 0 then 'partial' else v_order.status end, 'received_units', v_received, 'ordered_units', v_total);
end;
$$;

revoke all on function public.studio_receive_purchase_order(uuid, jsonb) from public;
grant execute on function public.studio_receive_purchase_order(uuid, jsonb) to authenticated;
