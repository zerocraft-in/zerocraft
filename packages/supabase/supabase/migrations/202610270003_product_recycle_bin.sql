-- Recoverable product deletion with a 15-day retention window.
-- Durable order, purchase-order, transfer and inventory history is retained.

alter table public.store_products
  add column if not exists deleted_at timestamptz,
  add column if not exists purge_after timestamptz,
  add column if not exists deleted_from_status text;

alter table public.store_products
  drop constraint if exists store_products_deleted_from_status_check,
  add constraint store_products_deleted_from_status_check
    check (deleted_from_status is null or deleted_from_status in ('draft', 'active', 'archived')),
  drop constraint if exists store_products_delete_window_check,
  add constraint store_products_delete_window_check
    check (
      (deleted_at is null and purge_after is null and deleted_from_status is null)
      or (deleted_at is not null and purge_after is not null and deleted_from_status is not null and purge_after >= deleted_at + interval '15 days')
    );

create index if not exists store_products_recycle_bin_idx
  on public.store_products(purge_after)
  where deleted_at is not null;

-- These operational rows must outlive the catalog record they once referenced.
alter table public.store_inventory_movements alter column variant_id drop not null;
alter table public.store_inventory_movements drop constraint if exists store_inventory_movements_variant_id_fkey;
alter table public.store_inventory_movements add constraint store_inventory_movements_variant_id_fkey foreign key (variant_id) references public.store_product_variants(id) on delete set null;

alter table public.store_purchase_order_items alter column variant_id drop not null;
alter table public.store_purchase_order_items drop constraint if exists store_purchase_order_items_variant_id_fkey;
alter table public.store_purchase_order_items add constraint store_purchase_order_items_variant_id_fkey foreign key (variant_id) references public.store_product_variants(id) on delete set null;

alter table public.store_inventory_transfer_items alter column variant_id drop not null;
alter table public.store_inventory_transfer_items drop constraint if exists store_inventory_transfer_items_variant_id_fkey;
alter table public.store_inventory_transfer_items add constraint store_inventory_transfer_items_variant_id_fkey foreign key (variant_id) references public.store_product_variants(id) on delete set null;

create or replace function public.studio_purge_expired_products()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  purged_count integer := 0;
begin
  delete from public.store_inventory_reservations
  where variant_id in (
    select v.id from public.store_product_variants v
    join public.store_products p on p.id = v.product_id
    where p.purge_after <= now()
  );

  delete from public.store_cart_items
  where variant_id in (
    select v.id from public.store_product_variants v
    join public.store_products p on p.id = v.product_id
    where p.purge_after <= now()
  );

  delete from public.store_bundle_items
  where product_id in (select id from public.store_products where purge_after <= now());

  delete from public.store_products where purge_after <= now();
  get diagnostics purged_count = row_count;
  return purged_count;
end;
$$;

revoke all on function public.studio_purge_expired_products() from public;

create extension if not exists pg_cron with schema extensions;

do $schedule$
begin
  if exists (select 1 from cron.job where jobname = 'studio-purge-expired-products') then
    perform cron.unschedule('studio-purge-expired-products');
  end if;
  perform cron.schedule(
    'studio-purge-expired-products',
    '30 3 * * *',
    $job$select public.studio_purge_expired_products();$job$
  );
end;
$schedule$;
