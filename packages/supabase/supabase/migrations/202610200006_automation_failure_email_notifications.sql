-- Track one failure email claim per automation run and admin/manager recipient.

create table if not exists public.studio_automation_failure_notifications (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.studio_automation_runs(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  recipient text not null,
  status text not null default 'sending' check (status in ('sending', 'sent', 'failed')),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (run_id, recipient_id)
);

create index if not exists studio_automation_failure_notifications_created_idx
  on public.studio_automation_failure_notifications(created_at desc);
alter table public.studio_automation_failure_notifications enable row level security;
drop policy if exists "Studio read automation failure notifications" on public.studio_automation_failure_notifications;
create policy "Studio read automation failure notifications"
  on public.studio_automation_failure_notifications for select to authenticated
  using (public.is_studio_member());
drop policy if exists "Studio create automation failure notifications" on public.studio_automation_failure_notifications;
create policy "Studio create automation failure notifications"
  on public.studio_automation_failure_notifications for insert to authenticated
  with check (public.is_studio_member());
drop policy if exists "Studio update automation failure notifications" on public.studio_automation_failure_notifications;
create policy "Studio update automation failure notifications"
  on public.studio_automation_failure_notifications for update to authenticated
  using (public.is_studio_member())
  with check (public.is_studio_member());
grant select, insert, update on public.studio_automation_failure_notifications to authenticated;
