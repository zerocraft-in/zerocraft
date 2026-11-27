-- Store-only transition. User-authorized removal; take and verify a private snapshot first.
-- Backup schema is deliberately excluded from PostgREST and denies anon/authenticated.
create schema if not exists zc_backup_20261101_store_only;
revoke all on schema zc_backup_20261101_store_only from public, anon, authenticated;
do $$
declare item record; source_hash text; backup_hash text;
begin
  for item in select tablename from pg_tables where schemaname='public' loop
    if to_regclass('zc_backup_20261101_store_only.' || quote_ident(item.tablename)) is null then
      execute format('create table zc_backup_20261101_store_only.%I (like public.%I including all)',item.tablename,item.tablename);
      execute format('insert into zc_backup_20261101_store_only.%I overriding system value select * from public.%I',item.tablename,item.tablename);
    end if;
    if item.tablename = any(array['blogs','works','reviews','clients','appointments','studio_leads','studio_lead_activities','studio_projects','studio_project_milestones']) then
      execute format('select md5(coalesce(string_agg(row_to_json(t)::text, %L order by row_to_json(t)::text),%L)) from public.%I t', '', '', item.tablename) into source_hash;
      execute format('select md5(coalesce(string_agg(row_to_json(t)::text, %L order by row_to_json(t)::text),%L)) from zc_backup_20261101_store_only.%I t', '', '', item.tablename) into backup_hash;
      if source_hash is distinct from backup_hash then raise exception 'Studio backup no longer matches %. Refresh backup before deletion.',item.tablename; end if;
    end if;
  end loop;
end $$;
revoke all on all tables in schema zc_backup_20261101_store_only from public, anon, authenticated;

-- Explicitly enumerated removal. No CASCADE; unexpected dependencies abort the migration.
drop table if exists public.studio_project_milestones, public.studio_projects,
 public.studio_lead_activities, public.studio_leads, public.appointments,
 public.clients, public.works, public.blogs, public.reviews;

-- Keep staff access, sessions, notifications, integrations and store operations intact.
do $$
declare item record;
begin
 for item in select tablename from pg_tables where schemaname='public' and tablename like 'studio\_%' escape '\' loop
  execute format('alter table public.%I rename to %I',item.tablename,replace(item.tablename,'studio_','commerce_'));
 end loop;
 for item in select p.oid,p.proname,pg_get_function_identity_arguments(p.oid) args from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' and position('studio_' in p.proname)>0 loop
  execute format('alter function public.%I(%s) rename to %I',item.proname,item.args,replace(item.proname,'studio_','commerce_'));
 end loop;
 -- Function bodies are textual SQL/PLpgSQL and need rewriting after OID-preserving renames.
 for item in select p.oid,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' and (position('studio_' in p.prosrc)>0 or position('/api/studio' in p.prosrc)>0) loop
  execute replace(replace(item.definition,'studio_','commerce_'),'/api/studio','/api/admin');
 end loop;
 if to_regclass('cron.job') is not null then
  for item in execute 'select jobid,command from cron.job where command like ''%studio%''' loop
   perform cron.alter_job(item.jobid, command := replace(replace(item.command,'studio_','commerce_'),'/api/studio','/api/admin'));
  end loop;
 end if;
end $$;

-- Preserve the existing customer-access grants under store-specific names.
insert into public.commerce_permissions(key,label,description,group_name,sort_order)
 select replace(key,'clients.','customers.'),replace(label,'Client','Customer'),description,'Customers',sort_order from public.commerce_permissions where key like 'clients.%' on conflict (key) do nothing;
insert into public.commerce_role_permissions(role,permission_key,allowed)
 select role,replace(permission_key,'clients.','customers.'),allowed from public.commerce_role_permissions where permission_key like 'clients.%' on conflict do nothing;
insert into public.commerce_user_permissions(user_id,permission_key,allowed)
 select user_id,replace(permission_key,'clients.','customers.'),allowed from public.commerce_user_permissions where permission_key like 'clients.%' on conflict do nothing;

-- Remove Studio-specific capabilities. Store content and catalog capabilities remain.
delete from public.commerce_role_permissions where permission_key like 'clients.%' or permission_key like 'appointments.%';
delete from public.commerce_user_permissions where permission_key like 'clients.%' or permission_key like 'appointments.%';
delete from public.commerce_permissions where key like 'clients.%' or key like 'appointments.%';
delete from public.commerce_features where feature_key='crm';
update public.commerce_features set display_name='Store content',description='Store pages, menus, blog posts, and media.' where feature_key='content';
delete from public.notifications where category in ('clients','projects','appointments') or link like '/studio/%';

-- Store-only notifications; derive identity after record_data has been assigned.
create or replace function public.commerce_notify_record_change()
returns trigger language plpgsql security definer set search_path=public as $$
declare r jsonb; record_id text; record_name text; status_value text; event_key text;
begin
 r := to_jsonb(new);
 record_id := coalesce(r->>'id',r->>'order_number','unknown');
 record_name := coalesce(r->>'order_number',r->>'title',record_id);
 status_value := coalesce(r->>'status','updated');
 if tg_table_name='store_orders' then
  if tg_op='UPDATE' and new.status is not distinct from old.status and new.payment_status is not distinct from old.payment_status then return new; end if;
  event_key := 'order:'||record_id||':'||status_value||':'||coalesce(r->>'payment_status','');
  perform public.commerce_emit_notification('Order '||record_name||' '||status_value,'Order status: '||status_value,case when r->>'payment_status'='paid' then 'payments' else 'orders' end,'info','/store/orders',event_key,'store',r);
 elsif tg_table_name='store_payment_submissions' then
  if tg_op='UPDATE' and new.status is not distinct from old.status then return new; end if;
  perform public.commerce_emit_notification('Payment proof '||status_value,'A manual payment submission needs attention.','payments','info','/store/orders','payment-submission:'||record_id||':'||status_value,'store',r);
 elsif tg_table_name='store_inventory_levels' then
  if coalesce((r->>'on_hand')::integer,0)-coalesce((r->>'reserved')::integer,0)>coalesce((r->>'reorder_point')::integer,0) then return new; end if;
  perform public.commerce_emit_notification('Low stock requires attention','Inventory is at or below its reorder point.','inventory','warning','/store/inventory','inventory-low:'||coalesce(r->>'location_id','')||':'||coalesce(r->>'variant_id',''),'store',r);
 end if;
 return new;
end $$;
revoke all on function public.commerce_notify_record_change() from public,anon,authenticated;
notify pgrst,'reload schema';
