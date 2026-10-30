-- Unified real-time notifications for commerce and studio operations.
-- This migration is additive and keeps existing notification history intact.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;

alter table public.notifications add column if not exists workspace text not null default 'studio';
alter table public.notifications add column if not exists event_key text;
create index if not exists notifications_recipient_created_idx
  on public.notifications(recipient_id, created_at desc);
create index if not exists notifications_recipient_unread_idx
  on public.notifications(recipient_id, read, created_at desc);
create unique index if not exists notifications_event_key_idx
  on public.notifications(event_key) where event_key is not null;

alter table public.notifications enable row level security;
drop policy if exists "Studio manage notifications" on public.notifications;
drop policy if exists "Studio read own notifications" on public.notifications;
drop policy if exists "Studio create notifications" on public.notifications;
drop policy if exists "Studio update own notifications" on public.notifications;
drop policy if exists "Studio delete own notifications" on public.notifications;
create policy "Studio read own notifications"
  on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));
create policy "Studio create notifications"
  on public.notifications for insert to authenticated
  with check (public.is_studio_member());
create policy "Studio update own notifications"
  on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));
create policy "Studio delete own notifications"
  on public.notifications for delete to authenticated
  using (recipient_id = (select auth.uid()));

create or replace function public.studio_emit_notification(
  p_title text,
  p_message text,
  p_category text,
  p_type text,
  p_link text,
  p_event_key text,
  p_workspace text default 'studio',
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient record;
  inserted_count integer := 0;
begin
  for recipient in
    select id
    from public.profiles
    where role::text in ('admin', 'manager', 'staff')
      and coalesce(is_active, true)
  loop
    insert into public.notifications (
      title, message, category, type, read, link, recipient_id,
      dedupe_key, event_key, workspace, metadata
    ) values (
      left(coalesce(p_title, 'Workspace update'), 180),
      left(coalesce(p_message, ''), 1000),
      coalesce(nullif(p_category, ''), 'system'),
      case when p_type in ('info', 'success', 'warning', 'error') then p_type else 'info' end,
      false,
      p_link,
      recipient.id,
      case when p_event_key is null then null else p_event_key || ':' || recipient.id::text end,
      case when p_event_key is null then null else p_event_key || ':' || recipient.id::text end,
      coalesce(nullif(p_workspace, ''), 'studio'),
      coalesce(p_metadata, '{}'::jsonb)
    )
    on conflict (event_key) where event_key is not null do update set
      title = excluded.title,
      message = excluded.message,
      type = excluded.type,
      category = excluded.category,
      link = excluded.link,
      workspace = excluded.workspace,
      metadata = excluded.metadata,
      read = false;
    inserted_count := inserted_count + 1;
  end loop;
  return inserted_count;
end;
$$;
revoke all on function public.studio_emit_notification(text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;

create or replace function public.studio_notify_record_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  record_data jsonb;
  record_id text := coalesce(record_data->>'id', record_data->>'order_number', 'unknown');
  record_name text := coalesce(record_data->>'name', record_data->>'title', record_data->>'customer_name', record_data->>'order_number', record_id);
  status_value text := coalesce(record_data->>'status', 'updated');
  event_name text := case when tg_op = 'INSERT' then 'created' else 'updated' end;
  event_key text;
begin
  record_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  if tg_table_name = 'store_orders' then
    if tg_op = 'UPDATE'
      and new.status is not distinct from old.status
      and new.payment_status is not distinct from old.payment_status then
      return new;
    end if;
    event_key := 'order:' || record_id || ':' || coalesce(record_data->>'status', '') || ':' || coalesce(record_data->>'payment_status', '');
    perform public.studio_emit_notification(
      case when tg_op = 'INSERT' then 'New order ' || record_name else 'Order ' || record_name || ' updated' end,
      case when coalesce(record_data->>'payment_status', 'unpaid') = 'paid'
        then 'Payment is paid and order status is ' || status_value || '.'
        else 'Order status is ' || status_value || ' and payment is ' || coalesce(record_data->>'payment_status', 'unpaid') || '.' end,
      case when coalesce(record_data->>'payment_status', 'unpaid') = 'paid' then 'payments' else 'orders' end,
      case when status_value in ('cancelled', 'refunded') then 'warning' else 'info' end,
      '/store/orders', event_key, 'store', record_data);
    return new;
  end if;

  if tg_table_name = 'store_payment_submissions' then
    if tg_op = 'UPDATE' and new.status is not distinct from old.status then return new; end if;
    event_key := 'payment-submission:' || record_id || ':' || status_value;
    perform public.studio_emit_notification(
      'Payment proof ' || status_value,
      'A manual payment submission needs attention.', 'payments',
      case when status_value = 'rejected' then 'warning' else 'info' end,
      '/store/orders', event_key, 'store', record_data);
    return new;
  end if;

  if tg_table_name = 'store_inventory_levels' then
    if coalesce((record_data->>'on_hand')::integer, 0) - coalesce((record_data->>'reserved')::integer, 0)
      > coalesce((record_data->>'reorder_point')::integer, 0) then return new; end if;
    event_key := 'inventory-low:' || coalesce(record_data->>'location_id', '') || ':' || coalesce(record_data->>'variant_id', '');
    perform public.studio_emit_notification(
      'Low stock requires attention',
      'Inventory is at or below its reorder point.', 'inventory', 'warning',
      '/store/inventory', event_key, 'store', record_data);
    return new;
  end if;

  if tg_table_name = 'studio_projects' then
    if tg_op = 'UPDATE' and new.status is not distinct from old.status and new.deadline is not distinct from old.deadline then return new; end if;
    event_key := 'project:' || record_id || ':' || status_value || ':' || coalesce(record_data->>'deadline', '');
    perform public.studio_emit_notification(
      'Project ' || event_name || ': ' || record_name,
      'Project status is now ' || status_value || '.', 'projects',
      case when status_value in ('blocked', 'cancelled') then 'warning' else 'info' end,
      '/studio/projects', event_key, 'studio', record_data);
    return new;
  end if;

  if tg_table_name = 'clients' then
    event_key := 'client:' || record_id || ':' || event_name;
    perform public.studio_emit_notification(
      'Client ' || event_name || ': ' || record_name,
      'A client record was ' || event_name || '.', 'clients', 'info',
      '/studio/clients', event_key, 'studio', record_data);
    return new;
  end if;

  return new;
end;
$$;

do $$
begin
  if to_regclass('public.store_orders') is not null then
    drop trigger if exists studio_notify_store_orders on public.store_orders;
    create trigger studio_notify_store_orders after insert or update on public.store_orders
      for each row execute function public.studio_notify_record_change();
  end if;
  if to_regclass('public.store_inventory_levels') is not null then
    drop trigger if exists studio_notify_inventory on public.store_inventory_levels;
    create trigger studio_notify_inventory after insert or update on public.store_inventory_levels
      for each row execute function public.studio_notify_record_change();
  end if;
  if to_regclass('public.store_payment_submissions') is not null then
    drop trigger if exists studio_notify_payment_submissions on public.store_payment_submissions;
    create trigger studio_notify_payment_submissions after insert or update on public.store_payment_submissions
      for each row execute function public.studio_notify_record_change();
  end if;
  if to_regclass('public.studio_projects') is not null then
    drop trigger if exists studio_notify_projects on public.studio_projects;
    create trigger studio_notify_projects after insert or update on public.studio_projects
      for each row execute function public.studio_notify_record_change();
  end if;
  if to_regclass('public.clients') is not null then
    drop trigger if exists studio_notify_clients on public.clients;
    create trigger studio_notify_clients after insert or update on public.clients
      for each row execute function public.studio_notify_record_change();
  end if;
end
$$;

grant execute on function public.studio_emit_notification(text, text, text, text, text, text, text, jsonb) to service_role;
