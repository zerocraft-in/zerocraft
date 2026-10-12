-- Run after admin-mvp.sql in the same Supabase project. No sample data is inserted.
create table if not exists public.studio_automation_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  event_type text not null check (event_type in ('store_order_created', 'appointment_created')),
  entity_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'delivered', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists studio_automation_events_queue_idx on public.studio_automation_events (status, next_attempt_at, created_at);
alter table public.studio_automation_events enable row level security;
drop policy if exists "Studio automation read" on public.studio_automation_events;
create policy "Studio automation read" on public.studio_automation_events for select to authenticated using (public.is_studio_member());
grant select on public.studio_automation_events to authenticated;

create or replace function public.queue_studio_automation_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.studio_automation_events (event_key, event_type, entity_id)
  values (tg_table_name || ':created:' || new.id::text,
    case when tg_table_name = 'store_orders' then 'store_order_created' else 'appointment_created' end,
    new.id)
  on conflict (event_key) do nothing;
  return new;
end;
$$;
drop trigger if exists studio_order_automation_created on public.store_orders;
create trigger studio_order_automation_created after insert on public.store_orders
for each row execute function public.queue_studio_automation_event();
drop trigger if exists studio_appointment_automation_created on public.appointments;
create trigger studio_appointment_automation_created after insert on public.appointments
for each row execute function public.queue_studio_automation_event();

-- Atomic claim prevents concurrent workers from delivering the same event at once.
create or replace function public.claim_studio_automation_events(batch_size integer default 10)
returns setof public.studio_automation_events language plpgsql security definer set search_path = '' as $$
begin
  return query
  with picked as (
    select id from public.studio_automation_events
    where (status in ('pending', 'failed') and next_attempt_at <= now() and attempts < 5)
       or (status = 'processing' and updated_at < now() - interval '10 minutes' and attempts < 5)
    order by created_at for update skip locked limit least(greatest(batch_size, 1), 20)
  )
  update public.studio_automation_events e
  set status = 'processing', attempts = e.attempts + 1, updated_at = now()
  from picked where e.id = picked.id returning e.*;
end;
$$;
revoke all on function public.claim_studio_automation_events(integer) from public, anon, authenticated;
grant execute on function public.claim_studio_automation_events(integer) to service_role;
