-- Persist scheduled and manual automation executions for CMS observability.

create table if not exists public.studio_automation_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  trigger text not null check (trigger in ('scheduled', 'manual')),
  status text not null check (status in ('running', 'succeeded', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  active_low_stock_count integer,
  error_message text,
  triggered_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists studio_automation_runs_job_created_idx
  on public.studio_automation_runs(job_name, created_at desc);
alter table public.studio_automation_runs enable row level security;
drop policy if exists "Studio read automation runs" on public.studio_automation_runs;
create policy "Studio read automation runs" on public.studio_automation_runs
  for select to authenticated using (public.is_studio_member());
drop policy if exists "Studio create automation runs" on public.studio_automation_runs;
create policy "Studio create automation runs" on public.studio_automation_runs
  for insert to authenticated with check (public.is_studio_member() and (triggered_by is null or triggered_by = (select auth.uid())));
grant select, insert on public.studio_automation_runs to authenticated;

create or replace function public.studio_sync_low_stock_alerts_scheduled()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  run_id uuid;
  started_at timestamptz := clock_timestamp();
  active_count integer := 0;
begin
  insert into public.studio_automation_runs (job_name, trigger, status, started_at)
  values ('studio-low-stock-alerts', 'scheduled', 'running', started_at)
  returning id into run_id;

  begin
    active_count := public.studio_sync_low_stock_alerts();
    update public.studio_automation_runs
    set status = 'succeeded', finished_at = clock_timestamp(), active_low_stock_count = active_count
    where id = run_id;
  exception when others then
    update public.studio_automation_runs
    set status = 'failed', finished_at = clock_timestamp(), error_message = left(sqlerrm, 1000)
    where id = run_id;
  end;

  return active_count;
end;
$$;

revoke all on function public.studio_sync_low_stock_alerts_scheduled() from public;

do $schedule$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id from cron.job where jobname = 'studio-low-stock-alerts';
  if existing_job_id is not null then perform cron.unschedule(existing_job_id); end if;
  perform cron.schedule('studio-low-stock-alerts', '*/15 * * * *', $job$select public.studio_sync_low_stock_alerts_scheduled();$job$);
end;
$schedule$;
