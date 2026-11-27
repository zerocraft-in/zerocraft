-- Remove the permissive "any store member" policies that let staff bypass
-- the CMS permission checks through direct PostgREST/table/RPC calls.
do $$
declare
  item record;
  read_name text;
  manage_name text;
begin
  for item in
    select * from (values
      ('automation_failure_notifications','Studio read automation failure notifications','automations.read','automations.manage'),
      ('automation_runs','Studio read automation runs','automations.read','automations.manage'),
      ('automation_settings','Studio read automation settings','automations.read','automations.manage'),
      ('banners','Studio manage storefront banners','content.read','content.manage'),
      ('bundle_items','Studio manage bundle items','catalog.read','catalog.manage'),
      ('bundles','Studio manage bundles','catalog.read','catalog.manage'),
      ('collection_products','Studio manage collection products','catalog.read','catalog.manage'),
      ('collections','Studio manage collections','catalog.read','catalog.manage'),
      ('customization_templates','Studio manage templates','catalog.read','catalog.manage'),
      ('deleted_files','Studio read recycled store assets','catalog.read','catalog.manage'),
      ('digital_files','Studio manage digital product files','catalog.read','catalog.manage'),
      ('email_events','Studio read email events','email.read','email.manage'),
      ('health_acknowledgements','Studio read health failure acknowledgements','system_health.read','system_health.manage'),
      ('health_checks','Studio read system health runs','system_health.read',null),
      ('health_incidents','Studio read system health incidents','system_health.read',null),
      ('inventory_reservations','Studio read inventory reservations','inventory.read',null),
      ('menu_items','Studio manage navigation items','content.read','content.manage'),
      ('menus','Studio manage navigation menus','content.read','content.manage'),
      ('option_values','Studio manage variant option values','catalog.read','catalog.manage'),
      ('order_items','Studio read order items','orders.read',null),
      ('payment_attempts','Studio read payment attempts','orders.manage',null),
      ('payment_submissions','Studio read payment submissions','orders.manage',null),
      ('permissions','Studio members read permissions','team.read',null),
      ('pages','Studio manage pages','content.read','content.manage'),
      ('product_media','Studio manage product media','catalog.read','catalog.manage'),
      ('product_options','Studio manage variant options','catalog.read','catalog.manage'),
      ('purchase_order_items','Studio manage purchase order items','inventory.read','inventory.manage'),
      ('purchase_orders','Studio manage purchase orders','inventory.read','inventory.manage'),
      ('report_runs','Studio read notification report runs','automations.read',null),
      ('report_settings','Studio read notification report settings','automations.read','automations.manage'),
      ('stock_alerts','Studio manage low stock alerts','inventory.read','inventory.manage'),
      ('store_settings','Studio manage site settings','settings.manage','settings.manage'),
      ('storefront_sections','Studio manage storefront sections','content.read','content.manage'),
      ('subcategories','Studio manage store subcategories','catalog.read','catalog.manage'),
      ('suppliers','Studio manage suppliers','inventory.read','inventory.manage'),
      ('variant_option_values','Studio manage variant values','catalog.read','catalog.manage')
    ) as v(table_name, old_policy, read_permission, manage_permission)
  loop
    execute format('drop policy if exists %I on public.%I', item.old_policy, item.table_name);
    read_name := 'RBAC ' || item.table_name || ' read';
    execute format('drop policy if exists %I on public.%I', read_name, item.table_name);
    execute format('create policy %I on public.%I for select to authenticated using (public.has_permission(%L) or %s)',
      read_name, item.table_name, item.read_permission,
      case when item.manage_permission is null then 'false' else format('public.has_permission(%L)', item.manage_permission) end);
    if item.manage_permission is not null then
      manage_name := 'RBAC ' || item.table_name || ' manage';
      execute format('drop policy if exists %I on public.%I', manage_name, item.table_name);
      execute format('create policy %I on public.%I for all to authenticated using (public.has_permission(%L)) with check (public.has_permission(%L))',
        manage_name, item.table_name, item.manage_permission, item.manage_permission);
    end if;
  end loop;
end;
$$;

drop policy if exists "Studio create automation failure notifications" on public.automation_failure_notifications;
drop policy if exists "Studio update automation failure notifications" on public.automation_failure_notifications;
drop policy if exists "Studio read automation failure notifications" on public.automation_failure_notifications;
drop policy if exists "RBAC automation_failure_notifications read" on public.automation_failure_notifications;
drop policy if exists "RBAC automation_failure_notifications manage" on public.automation_failure_notifications;
create policy "RBAC automation failure notifications read" on public.automation_failure_notifications for select to authenticated
  using (public.has_permission('automations.read'));
create policy "RBAC automation failure notifications manage" on public.automation_failure_notifications for all to authenticated
  using (public.has_permission('automations.manage')) with check (public.has_permission('automations.manage'));

drop policy if exists "Studio create automation runs" on public.automation_runs;
drop policy if exists "Studio read automation runs" on public.automation_runs;
drop policy if exists "RBAC automation_runs read" on public.automation_runs;
drop policy if exists "RBAC automation_runs manage" on public.automation_runs;
create policy "RBAC automation runs read" on public.automation_runs for select to authenticated
  using (public.has_permission('automations.read'));
create policy "RBAC automation runs create own" on public.automation_runs for insert to authenticated
  with check (public.has_permission('automations.manage') and triggered_by = (select auth.uid()));

drop policy if exists "Studio manage recycled store assets" on public.deleted_files;
drop policy if exists "Studio read recycled store assets" on public.deleted_files;
drop policy if exists "RBAC deleted_files read" on public.deleted_files;
drop policy if exists "RBAC deleted_files manage" on public.deleted_files;
create policy "RBAC deleted files read" on public.deleted_files for select to authenticated
  using (public.has_permission('catalog.read') or public.has_permission('catalog.manage'));
create policy "RBAC deleted files manage" on public.deleted_files for all to authenticated
  using (public.has_permission('catalog.manage')) with check (public.has_permission('catalog.manage'));

drop policy if exists "Studio create email events" on public.email_events;
drop policy if exists "Studio update email events" on public.email_events;
drop policy if exists "Studio read email events" on public.email_events;
drop policy if exists "RBAC email_events read" on public.email_events;
drop policy if exists "RBAC email_events manage" on public.email_events;
create policy "RBAC email events read" on public.email_events for select to authenticated
  using (public.has_permission('email.read') or public.has_permission('email.manage'));
create policy "RBAC email events create own" on public.email_events for insert to authenticated
  with check (public.has_permission('email.manage') and created_by = (select auth.uid()));
create policy "RBAC email events update" on public.email_events for update to authenticated
  using (public.has_permission('email.manage')) with check (public.has_permission('email.manage'));

drop policy if exists "Studio read health failure acknowledgements" on public.health_acknowledgements;
drop policy if exists "Studio manage health failure acknowledgements" on public.health_acknowledgements;
drop policy if exists "RBAC health_acknowledgements read" on public.health_acknowledgements;
drop policy if exists "RBAC health_acknowledgements manage" on public.health_acknowledgements;
create policy "RBAC health acknowledgements read" on public.health_acknowledgements for select to authenticated
  using (public.has_permission('system_health.read'));
create policy "RBAC health acknowledgements manage" on public.health_acknowledgements for all to authenticated
  using (public.has_permission('system_health.manage')) with check (public.has_permission('system_health.manage'));

drop policy if exists "Studio read automation settings" on public.automation_settings;
drop policy if exists "Studio admins manage automation settings" on public.automation_settings;
drop policy if exists "RBAC automation_settings read" on public.automation_settings;
drop policy if exists "RBAC automation_settings manage" on public.automation_settings;
create policy "RBAC automation settings read" on public.automation_settings for select to authenticated
  using (public.has_permission('automations.read') or public.has_permission('automations.manage'));
create policy "RBAC automation settings manage" on public.automation_settings for all to authenticated
  using (public.has_permission('automations.manage')) with check (public.has_permission('automations.manage'));

-- Keep self-service records private to the account that owns them.
drop policy if exists "Profiles self or studio read" on public.accounts;
create policy "RBAC accounts read" on public.accounts for select to authenticated
  using (id = (select auth.uid()) or public.has_permission('team.read'));

drop policy if exists "Studio read audit logs" on public.audit_logs;
drop policy if exists "Studio write audit logs" on public.audit_logs;
create policy "RBAC audit logs read" on public.audit_logs for select to authenticated
  using (public.has_permission('audit.read'));
create policy "RBAC audit logs write" on public.audit_logs for insert to authenticated
  with check (public.has_permission('audit.write') and actor_id = (select auth.uid()));

drop policy if exists "Studio create notifications" on public.notifications;
drop policy if exists "Studio read notifications" on public.notifications;
create policy "RBAC notification create" on public.notifications for insert to authenticated
  with check (public.has_permission('notifications.manage') and recipient_id is not null);

drop policy if exists "Studio read notification preferences" on public.notification_preferences;
create policy "Own notification preferences read" on public.notification_preferences for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Studio read payment attempts" on public.payment_attempts;
drop policy if exists "Customers read own payment attempts" on public.payment_attempts;
create policy "Own or authorized payment attempts read" on public.payment_attempts for select to authenticated
  using (customer_id = (select auth.uid()) or public.has_permission('orders.manage'));

drop policy if exists "Studio read payment submissions" on public.payment_submissions;
drop policy if exists "Customers read own payment submissions" on public.payment_submissions;
create policy "Own or authorized payment submissions read" on public.payment_submissions for select to authenticated
  using (customer_id = (select auth.uid()) or public.has_permission('orders.manage'));

drop policy if exists "Profiles self or studio read" on public.accounts;
drop policy if exists "Studio admins manage profiles" on public.accounts;
create policy "RBAC accounts update" on public.accounts for update to authenticated
  using (public.is_admin() and public.has_permission('team.manage'))
  with check (public.is_admin() and public.has_permission('team.manage'));

-- Public catalog reads remain public for published items; unpublished items
-- are visible only to users with the corresponding read permission.
drop policy if exists "Active store categories or studio read" on public.categories;
create policy "Active store categories are public" on public.categories for select to public
  using (is_active);
create policy "RBAC categories read" on public.categories for select to authenticated
  using (public.has_permission('catalog.read') or public.has_permission('catalog.manage'));
drop policy if exists "Active store products or studio read" on public.products;
create policy "Active store products are public" on public.products for select to public
  using (status = 'active');
create policy "RBAC products read" on public.products for select to authenticated
  using (public.has_permission('catalog.read') or public.has_permission('catalog.manage'));
drop policy if exists "product_online_publication" on public.products;
create policy "product_online_publication" on public.products for select to public
  using (status = 'active' and deleted_at is null and sales_channels @> array['online_store']::text[]);
drop policy if exists "Active variants of active products or studio read" on public.variants;
create policy "Active variants of active products or authorized read" on public.variants for select to public
  using (is_active and exists (select 1 from public.products product where product.id = variants.product_id and product.status = 'active'));
create policy "RBAC variants read" on public.variants for select to authenticated
  using (public.has_permission('catalog.read') or public.has_permission('catalog.manage'));

create or replace function public.get_automation_health()
returns table(job_name text, schedule text, active boolean, last_run_at timestamptz, last_run_status text, last_run_message text, next_run_at timestamptz)
language plpgsql security definer set search_path = 'public','cron' as $$
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' and not public.has_permission('automations.read') then
    raise exception using errcode='42501',message='Automation read permission required.';
  end if;
  return query
  select job.jobname::text,job.schedule::text,job.active,latest.start_time,latest.status::text,latest.return_message,
    case when job.active then date_trunc('hour',now())+((floor(extract(minute from now())/15)::int+1)*interval '15 minutes') else null end
  from cron.job job left join lateral (
    select details.start_time,details.status,details.return_message from cron.job_run_details details
    where details.jobid=job.jobid order by details.start_time desc limit 1
  ) latest on true where job.jobname='studio-low-stock-alerts';
end; $$;

create or replace function public.get_notification_analytics()
returns table(user_id uuid,email text,full_name text,total_count bigint,unread_count bigint,read_count bigint,last_notification_at timestamptz)
language plpgsql security definer set search_path = 'public' as $$
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' and not public.is_admin() then
    raise exception using errcode='42501',message='Admin access required';
  end if;
  return query select p.id,p.email,p.full_name,count(n.id)::bigint,
    count(n.id) filter(where n.read=false)::bigint,count(n.id) filter(where n.read=true)::bigint,max(n.created_at)
  from public.accounts p left join public.notifications n on n.recipient_id=p.id
  where p.role::text in ('admin','manager','staff') group by p.id,p.email,p.full_name
  order by count(n.id) filter(where n.read=false) desc,p.email;
end; $$;

-- Inventory RPCs must apply the same permission boundary as their API routes.
create or replace function public.receive_inventory_transfer(p_transfer_id uuid)
returns jsonb language plpgsql security definer set search_path = 'public' as $$
declare v_transfer public.transfers%rowtype; v_item record; v_source public.inventory_levels%rowtype; v_total integer := 0;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' and not public.has_permission('inventory.manage') then raise exception using errcode='42501',message='Inventory manage permission required.'; end if;
  select * into v_transfer from public.transfers where id=p_transfer_id for update;
  if not found then raise exception using errcode='P0002',message='Transfer not found.'; end if;
  if v_transfer.status <> 'in_transit' then raise exception using errcode='P0001',message='Only in-transit transfers can be received.'; end if;
  for v_item in select * from public.transfer_items where transfer_id=p_transfer_id loop
    select * into v_source from public.inventory_levels where location_id=v_transfer.from_location_id and variant_id=v_item.variant_id for update;
    if not found or v_source.on_hand-v_source.reserved < v_item.quantity then raise exception using errcode='P0001',message='Insufficient available stock for transfer.'; end if;
    update public.inventory_levels set on_hand=on_hand-v_item.quantity,updated_at=now() where location_id=v_transfer.from_location_id and variant_id=v_item.variant_id;
    insert into public.inventory_levels(location_id,variant_id,on_hand,reserved,reorder_point) values(v_transfer.to_location_id,v_item.variant_id,v_item.quantity,0,0)
      on conflict(location_id,variant_id) do update set on_hand=public.inventory_levels.on_hand+excluded.on_hand,updated_at=now();
    insert into public.inventory_movements(location_id,variant_id,quantity_delta,reason,reference_type,reference_id,created_by) values(v_transfer.from_location_id,v_item.variant_id,-v_item.quantity,'inventory_transfer_out','inventory_transfer',p_transfer_id,auth.uid()),(v_transfer.to_location_id,v_item.variant_id,v_item.quantity,'inventory_transfer_in','inventory_transfer',p_transfer_id,auth.uid());
    v_total := v_total + v_item.quantity;
  end loop;
  update public.transfers set status='received',updated_at=now() where id=p_transfer_id;
  return jsonb_build_object('transfer_id',p_transfer_id,'status','received','units',v_total);
end; $$;

-- Keep the existing purchase receipt transaction, changing only its authorization guard.
create or replace function public.receive_purchase_order(p_order_id uuid, p_receipts jsonb)
returns jsonb language plpgsql security definer set search_path = 'public' as $$
declare v_order public.purchase_orders%rowtype; v_receipt record; v_item public.purchase_order_items%rowtype; v_level public.inventory_levels%rowtype; v_total integer; v_received integer;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' and not public.has_permission('inventory.manage') then raise exception using errcode='42501',message='Inventory manage permission required.'; end if;
  if jsonb_typeof(coalesce(p_receipts,'[]'::jsonb)) <> 'array' then raise exception using errcode='22023',message='Receipts must be an array.'; end if;
  select * into v_order from public.purchase_orders where id=p_order_id for update;
  if not found then raise exception using errcode='P0002',message='Purchase order not found.'; end if;
  if v_order.status in ('cancelled','received') then raise exception using errcode='P0001',message='This purchase order cannot receive more stock.'; end if;
  for v_receipt in select * from jsonb_to_recordset(p_receipts) as x(item_id uuid, quantity integer) loop
    if v_receipt.quantity is null or v_receipt.quantity <= 0 then raise exception using errcode='22023',message='Received quantity must be positive.'; end if;
    select * into v_item from public.purchase_order_items where id=v_receipt.item_id and purchase_order_id=p_order_id for update;
    if not found then raise exception using errcode='P0002',message='Purchase order item not found.'; end if;
    if v_item.quantity_received+v_receipt.quantity > v_item.quantity_ordered then raise exception using errcode='22023',message='Received quantity cannot exceed ordered quantity.'; end if;
    update public.purchase_order_items set quantity_received=quantity_received+v_receipt.quantity where id=v_item.id;
    select * into v_level from public.inventory_levels where location_id=v_order.location_id and variant_id=v_item.variant_id for update;
    if found then update public.inventory_levels set on_hand=on_hand+v_receipt.quantity,updated_at=now() where location_id=v_order.location_id and variant_id=v_item.variant_id;
    else insert into public.inventory_levels(location_id,variant_id,on_hand,reserved,reorder_point) values(v_order.location_id,v_item.variant_id,v_receipt.quantity,0,0); end if;
    insert into public.inventory_movements(location_id,variant_id,quantity_delta,reason,reference_type,reference_id,created_by) values(v_order.location_id,v_item.variant_id,v_receipt.quantity,'purchase_order_receipt','purchase_order',p_order_id,auth.uid());
  end loop;
  select coalesce(sum(quantity_ordered),0),coalesce(sum(quantity_received),0) into v_total,v_received from public.purchase_order_items where purchase_order_id=p_order_id;
  update public.purchase_orders set status=case when v_received>=v_total then 'received' when v_received>0 then 'partial' else status end,updated_at=now() where id=p_order_id;
  return jsonb_build_object('order_id',p_order_id,'status',case when v_received>=v_total then 'received' when v_received>0 then 'partial' else v_order.status end,'received_units',v_received,'ordered_units',v_total);
end; $$;

-- These jobs mutate store-wide data or invoke a secret worker. Only a trusted
-- service or the database scheduler may call them.
revoke all on function public.purge_expired_products() from public, anon, authenticated;
grant execute on function public.purge_expired_products() to service_role;
revoke all on function public.purge_expired_store_categories() from public, anon, authenticated;
grant execute on function public.purge_expired_store_categories() to service_role;
revoke all on function public.queue_weekly_notification_report() from public, anon, authenticated;
grant execute on function public.queue_weekly_notification_report() to service_role;
revoke all on function public.trigger_weekly_notification_report_worker() from public, anon, authenticated;
grant execute on function public.trigger_weekly_notification_report_worker() to service_role;
revoke all on function public.sync_low_stock_alerts_scheduled() from public, anon, authenticated;
grant execute on function public.sync_low_stock_alerts_scheduled() to service_role;
revoke all on function public.receive_inventory_transfer(uuid) from public, anon, authenticated;
grant execute on function public.receive_inventory_transfer(uuid) to authenticated, service_role;
revoke all on function public.receive_purchase_order(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.receive_purchase_order(uuid, jsonb) to authenticated, service_role;
revoke all on function public.get_automation_health() from public, anon, authenticated;
grant execute on function public.get_automation_health() to authenticated, service_role;
revoke all on function public.get_notification_analytics() from public, anon, authenticated;
grant execute on function public.get_notification_analytics() to authenticated, service_role;
revoke all on function public.gmail_consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.gmail_consume_rate_limit(text, integer, integer) to authenticated, service_role;
revoke all on function public.permissions_for_current_user() from public, anon, authenticated;
grant execute on function public.permissions_for_current_user() to authenticated, service_role;
revoke all on function public.has_permission(text) from public, anon, authenticated;
grant execute on function public.has_permission(text) to authenticated, service_role;
revoke all on function public.soft_delete_store_subcategory(uuid) from public, anon, authenticated;
grant execute on function public.soft_delete_store_subcategory(uuid) to authenticated, service_role;

create or replace function public.sync_low_stock_alerts()
returns integer language plpgsql security definer set search_path = 'public' as $$
declare level_row record; member_row record; active_key text; active_count integer := 0;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' and not public.has_permission('automations.manage') then
    raise exception using errcode='42501',message='Automation manage permission required.';
  end if;
  for level_row in
    select il.location_id,il.variant_id,il.on_hand,il.reserved,il.reorder_point,
      coalesce(l.name,'Inventory location') location_name,coalesce(v.label,'Default variant') variant_label,coalesce(p.title,'Inventory item') product_title
    from public.inventory_levels il left join public.locations l on l.id=il.location_id
    left join public.variants v on v.id=il.variant_id left join public.products p on p.id=v.product_id
    where il.on_hand-il.reserved<=il.reorder_point
  loop
    active_key:=level_row.location_id::text||':'||level_row.variant_id::text; active_count:=active_count+1;
    insert into public.stock_alerts(location_id,variant_id,last_on_hand,last_reserved,last_reorder_point,status,last_detected_at,resolved_at)
      values(level_row.location_id,level_row.variant_id,level_row.on_hand,level_row.reserved,level_row.reorder_point,'active',now(),null)
      on conflict(location_id,variant_id) do update set last_on_hand=excluded.last_on_hand,last_reserved=excluded.last_reserved,last_reorder_point=excluded.last_reorder_point,status='active',last_detected_at=now(),resolved_at=null;
    for member_row in select id from public.accounts where role::text in ('admin','manager','staff') loop
      insert into public.notifications(title,message,category,type,read,link,recipient_id,dedupe_key,metadata)
        values('Low stock: '||level_row.product_title,level_row.variant_label||' at '||level_row.location_name||' has '||greatest(0,level_row.on_hand-level_row.reserved)||' available units, at or below the reorder point of '||level_row.reorder_point||'.','system','warning',false,'/store/inventory',member_row.id,'low-stock:'||active_key||':'||member_row.id::text,jsonb_build_object('locationId',level_row.location_id,'variantId',level_row.variant_id,'onHand',level_row.on_hand,'reserved',level_row.reserved,'reorderPoint',level_row.reorder_point,'source','pg_cron'))
        on conflict(dedupe_key) where dedupe_key is not null do update set title=excluded.title,message=excluded.message,type=excluded.type,read=false,metadata=excluded.metadata;
    end loop;
  end loop;
  update public.stock_alerts alert set status='resolved',resolved_at=now() where alert.status='active' and not exists(select 1 from public.inventory_levels il where il.location_id=alert.location_id and il.variant_id=alert.variant_id and il.on_hand-il.reserved<=il.reorder_point);
  update public.notifications notification set read=true where notification.dedupe_key like 'low-stock:%' and notification.read=false and not exists(select 1 from public.inventory_levels il where notification.dedupe_key like 'low-stock:'||il.location_id::text||':'||il.variant_id::text||':%' and il.on_hand-il.reserved<=il.reorder_point);
  return active_count;
end; $$;
revoke all on function public.sync_low_stock_alerts() from public, anon;
grant execute on function public.sync_low_stock_alerts() to authenticated, service_role;

create or replace function public.sync_low_stock_alerts_scheduled()
returns integer language plpgsql security definer set search_path = 'public' as $$
declare run_id uuid; started_at timestamptz:=clock_timestamp(); active_count integer:=0;
begin
  insert into public.automation_runs(job_name,trigger,status,started_at) values('studio-low-stock-alerts','scheduled','running',started_at) returning id into run_id;
  begin
    perform set_config('request.jwt.claim.role','service_role',true);
    active_count:=public.sync_low_stock_alerts();
    update public.automation_runs set status='succeeded',finished_at=clock_timestamp(),active_low_stock_count=active_count where id=run_id;
  exception when others then
    update public.automation_runs set status='failed',finished_at=clock_timestamp(),error_message=left(sqlerrm,1000) where id=run_id;
  end;
  return active_count;
end; $$;
revoke all on function public.sync_low_stock_alerts() from public, anon;
grant execute on function public.sync_low_stock_alerts() to authenticated, service_role;
notify pgrst, 'reload schema';
