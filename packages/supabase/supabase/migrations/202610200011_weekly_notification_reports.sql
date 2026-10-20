-- Weekly notification report scheduling and delivery queue.
-- Supabase pg_cron creates the queue item; the CMS SMTP worker delivers it.

create extension if not exists pg_cron with schema extensions;

create table if not exists public.studio_notification_report_settings (
  job_name text primary key default 'studio-weekly-notification-report',
  enabled boolean not null default false,
  weekday integer not null default 1 check (weekday between 0 and 6),
  send_hour_utc integer not null default 9 check (send_hour_utc between 0 and 23),
  recipient_roles text[] not null default array['admin']::text[],
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.studio_notification_report_settings (job_name)
values ('studio-weekly-notification-report')
on conflict (job_name) do nothing;

create table if not exists public.studio_notification_report_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null default 'studio-weekly-notification-report',
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  scheduled_for timestamptz not null default now(),
  period_start timestamptz not null default (now() - interval '7 days'),
  period_end timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  recipient_count integer not null default 0,
  notification_count integer not null default 0,
  error_message text,
  triggered_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists studio_notification_report_runs_created_idx
  on public.studio_notification_report_runs(created_at desc);

alter table public.studio_notification_report_settings enable row level security;
alter table public.studio_notification_report_runs enable row level security;

drop policy if exists "Studio read notification report settings" on public.studio_notification_report_settings;
create policy "Studio read notification report settings"
  on public.studio_notification_report_settings for select to authenticated
  using (public.is_studio_member());
drop policy if exists "Studio admins manage notification report settings" on public.studio_notification_report_settings;
create policy "Studio admins manage notification report settings"
  on public.studio_notification_report_settings for all to authenticated
  using (public.is_studio_admin()) with check (public.is_studio_admin());
drop policy if exists "Studio read notification report runs" on public.studio_notification_report_runs;
create policy "Studio read notification report runs"
  on public.studio_notification_report_runs for select to authenticated
  using (public.is_studio_member());
drop policy if exists "Studio admins create notification report runs" on public.studio_notification_report_runs;
create policy "Studio admins create notification report runs"
  on public.studio_notification_report_runs for insert to authenticated
  with check (public.is_studio_admin());
drop policy if exists "Studio admins update notification report runs" on public.studio_notification_report_runs;
create policy "Studio admins update notification report runs"
  on public.studio_notification_report_runs for update to authenticated
  using (public.is_studio_admin()) with check (public.is_studio_admin());

grant select on public.studio_notification_report_settings, public.studio_notification_report_runs to authenticated;
grant insert, update on public.studio_notification_report_settings, public.studio_notification_report_runs to authenticated;

create or replace function public.studio_queue_weekly_notification_report()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  settings_row record;
  run_id uuid;
  current_weekday integer := extract(dow from now() at time zone 'utc');
  current_hour integer := extract(hour from now() at time zone 'utc');
begin
  select * into settings_row from public.studio_notification_report_settings
  where job_name = 'studio-weekly-notification-report';
  if not found or not settings_row.enabled
    or settings_row.weekday <> current_weekday
    or settings_row.send_hour_utc <> current_hour then
    return null;
  end if;

  if exists (
    select 1 from public.studio_notification_report_runs
    where job_name = settings_row.job_name
      and scheduled_for > now() - interval '20 hours'
      and status in ('queued', 'running', 'succeeded')
  ) then return null; end if;

  insert into public.studio_notification_report_runs (job_name, scheduled_for, period_start, period_end)
  values (settings_row.job_name, now(), now() - interval '7 days', now())
  returning id into run_id;
  return run_id;
end;
$$;

revoke all on function public.studio_queue_weekly_notification_report() from public;

do $schedule$
begin
  if not exists (select 1 from cron.job where jobname = 'studio-weekly-notification-report') then
    perform cron.schedule(
      'studio-weekly-notification-report',
      '0 * * * *',
      $job$select public.studio_queue_weekly_notification_report();$job$
    );
  end if;
end;
$schedule$;
