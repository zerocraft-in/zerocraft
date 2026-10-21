-- Read-only automation health for the CMS.

create or replace function public.studio_get_automation_health()
returns table (
  job_name text,
  schedule text,
  active boolean,
  last_run_at timestamptz,
  last_run_status text,
  last_run_message text,
  next_run_at timestamptz
)
language sql
security definer
set search_path = public, cron
as $$
  select
    job.jobname::text,
    job.schedule::text,
    job.active,
    latest.start_time,
    latest.status::text,
    latest.return_message,
    case
      when job.active then date_trunc('hour', now()) +
        ((floor(extract(minute from now()) / 15)::int + 1) * interval '15 minutes')
      else null
    end
  from cron.job job
  left join lateral (
    select details.start_time, details.status, details.return_message
    from cron.job_run_details details
    where details.jobid = job.jobid
    order by details.start_time desc
    limit 1
  ) latest on true
  where job.jobname = 'studio-low-stock-alerts';
$$;

revoke all on function public.studio_get_automation_health() from public;
grant execute on function public.studio_get_automation_health() to authenticated;
