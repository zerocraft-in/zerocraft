-- Scheduled low-stock monitoring using Supabase pg_cron.
-- Runs entirely inside Postgres so the CMS does not need to be open.

create extension if not exists pg_cron with schema extensions;

create or replace function public.studio_sync_low_stock_alerts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  level_row record;
  member_row record;
  active_key text;
  active_count integer := 0;
begin
  for level_row in
    select
      il.location_id,
      il.variant_id,
      il.on_hand,
      il.reserved,
      il.reorder_point,
      coalesce(l.name, 'Inventory location') as location_name,
      coalesce(v.label, 'Default variant') as variant_label,
      coalesce(p.title, 'Inventory item') as product_title
    from public.store_inventory_levels il
    left join public.store_inventory_locations l on l.id = il.location_id
    left join public.store_product_variants v on v.id = il.variant_id
    left join public.store_products p on p.id = v.product_id
    where il.on_hand - il.reserved <= il.reorder_point
  loop
    active_key := level_row.location_id::text || ':' || level_row.variant_id::text;
    active_count := active_count + 1;

    insert into public.studio_low_stock_alerts (
      location_id, variant_id, last_on_hand, last_reserved, last_reorder_point,
      status, last_detected_at, resolved_at
    ) values (
      level_row.location_id, level_row.variant_id, level_row.on_hand,
      level_row.reserved, level_row.reorder_point, 'active', now(), null
    )
    on conflict (location_id, variant_id) do update set
      last_on_hand = excluded.last_on_hand,
      last_reserved = excluded.last_reserved,
      last_reorder_point = excluded.last_reorder_point,
      status = 'active',
      last_detected_at = now(),
      resolved_at = null;

    for member_row in
      select id
      from public.profiles
      where role::text in ('admin', 'manager', 'staff')
    loop
      insert into public.notifications (
        title, message, category, type, read, link, recipient_id,
        dedupe_key, metadata
      ) values (
        'Low stock: ' || level_row.product_title,
        level_row.variant_label || ' at ' || level_row.location_name ||
          ' has ' || greatest(0, level_row.on_hand - level_row.reserved) ||
          ' available units, at or below the reorder point of ' || level_row.reorder_point || '.',
        'system', 'warning', false, '/store/inventory', member_row.id,
        'low-stock:' || active_key || ':' || member_row.id::text,
        jsonb_build_object(
          'locationId', level_row.location_id,
          'variantId', level_row.variant_id,
          'onHand', level_row.on_hand,
          'reserved', level_row.reserved,
          'reorderPoint', level_row.reorder_point,
          'source', 'pg_cron'
        )
      )
      on conflict (dedupe_key) where dedupe_key is not null do update set
        title = excluded.title,
        message = excluded.message,
        type = excluded.type,
        read = false,
        metadata = excluded.metadata;
    end loop;
  end loop;

  update public.studio_low_stock_alerts alert
  set status = 'resolved', resolved_at = now()
  where alert.status = 'active'
    and not exists (
      select 1
      from public.store_inventory_levels il
      where il.location_id = alert.location_id
        and il.variant_id = alert.variant_id
        and il.on_hand - il.reserved <= il.reorder_point
    );

  update public.notifications notification
  set read = true
  where notification.dedupe_key like 'low-stock:%'
    and notification.read = false
    and not exists (
      select 1
      from public.store_inventory_levels il
      where notification.dedupe_key like 'low-stock:' || il.location_id::text || ':' || il.variant_id::text || ':%'
        and il.on_hand - il.reserved <= il.reorder_point
    );

  return active_count;
end;
$$;

revoke all on function public.studio_sync_low_stock_alerts() from public;

do $schedule$
begin
  if not exists (select 1 from cron.job where jobname = 'studio-low-stock-alerts') then
    perform cron.schedule(
      'studio-low-stock-alerts',
      '*/15 * * * *',
      $job$select public.studio_sync_low_stock_alerts();$job$
    );
  end if;
end;
$schedule$;
