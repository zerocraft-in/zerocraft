create table if not exists public.store_inventory_transfers (
  id uuid primary key default gen_random_uuid(),
  transfer_number text not null unique,
  from_location_id uuid not null references public.store_inventory_locations(id),
  to_location_id uuid not null references public.store_inventory_locations(id),
  status text not null default 'draft' check (status in ('draft','in_transit','received','cancelled')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_location_id <> to_location_id)
);
create table if not exists public.store_inventory_transfer_items (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.store_inventory_transfers(id) on delete cascade,
  variant_id uuid not null references public.store_product_variants(id),
  quantity integer not null check (quantity > 0),
  unique (transfer_id, variant_id)
);
create index if not exists store_inventory_transfers_status_idx on public.store_inventory_transfers(status, created_at desc);
alter table public.store_inventory_transfers enable row level security;
alter table public.store_inventory_transfer_items enable row level security;
drop policy if exists "Studio manage inventory transfers" on public.store_inventory_transfers;
create policy "Studio manage inventory transfers" on public.store_inventory_transfers for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());
drop policy if exists "Studio manage inventory transfer items" on public.store_inventory_transfer_items;
create policy "Studio manage inventory transfer items" on public.store_inventory_transfer_items for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());

create or replace function public.studio_receive_inventory_transfer(p_transfer_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_transfer public.store_inventory_transfers%rowtype; v_item record; v_source public.store_inventory_levels%rowtype; v_total integer := 0;
begin
  if not public.is_studio_member() then raise exception using errcode='42501',message='Studio access required.'; end if;
  select * into v_transfer from public.store_inventory_transfers where id=p_transfer_id for update;
  if not found then raise exception using errcode='P0002',message='Transfer not found.'; end if;
  if v_transfer.status <> 'in_transit' then raise exception using errcode='P0001',message='Only in-transit transfers can be received.'; end if;
  for v_item in select * from public.store_inventory_transfer_items where transfer_id=p_transfer_id loop
    select * into v_source from public.store_inventory_levels where location_id=v_transfer.from_location_id and variant_id=v_item.variant_id for update;
    if not found or v_source.on_hand-v_source.reserved < v_item.quantity then raise exception using errcode='P0001',message='Insufficient available stock for transfer.'; end if;
    update public.store_inventory_levels set on_hand=on_hand-v_item.quantity,updated_at=now() where location_id=v_transfer.from_location_id and variant_id=v_item.variant_id;
    insert into public.store_inventory_levels(location_id,variant_id,on_hand,reserved,reorder_point) values(v_transfer.to_location_id,v_item.variant_id,v_item.quantity,0,0)
      on conflict(location_id,variant_id) do update set on_hand=public.store_inventory_levels.on_hand+excluded.on_hand,updated_at=now();
    insert into public.store_inventory_movements(location_id,variant_id,quantity_delta,reason,reference_type,reference_id,created_by) values(v_transfer.from_location_id,v_item.variant_id,-v_item.quantity,'inventory_transfer_out','inventory_transfer',p_transfer_id,auth.uid()),(v_transfer.to_location_id,v_item.variant_id,v_item.quantity,'inventory_transfer_in','inventory_transfer',p_transfer_id,auth.uid());
    v_total := v_total + v_item.quantity;
  end loop;
  update public.store_inventory_transfers set status='received',updated_at=now() where id=p_transfer_id;
  return jsonb_build_object('transfer_id',p_transfer_id,'status','received','units',v_total);
end; $$;
revoke all on function public.studio_receive_inventory_transfer(uuid) from public;
grant execute on function public.studio_receive_inventory_transfer(uuid) to authenticated;
