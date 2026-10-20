-- Call the deployed CMS worker after pg_cron queues a weekly report.
-- Configure these Supabase Vault secrets before enabling the schedule:
--   zerocraft_weekly_report_worker_url    = https://your-cms.example.com/api/studio/notifications/reports/worker
--   zerocraft_weekly_report_worker_secret = same value as WEEKLY_REPORT_WORKER_SECRET

create extension if not exists pg_net with schema extensions;

create or replace function public.studio_trigger_weekly_notification_report_worker()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  queued_id uuid;
  worker_url text;
  worker_secret text;
begin
  select public.studio_queue_weekly_notification_report() into queued_id;
  if queued_id is null then return null; end if;
  select decrypted_secret into worker_url from vault.decrypted_secrets where name = 'zerocraft_weekly_report_worker_url' limit 1;
  select decrypted_secret into worker_secret from vault.decrypted_secrets where name = 'zerocraft_weekly_report_worker_secret' limit 1;
  if worker_url is null or worker_secret is null then return queued_id; end if;
  perform net.http_post(
    url := worker_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || worker_secret),
    body := jsonb_build_object('runId', queued_id)
  );
  return queued_id;
end;
$$;

revoke all on function public.studio_trigger_weekly_notification_report_worker() from public;

do $schedule$
begin
  if exists (select 1 from cron.job where jobname = 'studio-weekly-notification-report') then
    perform cron.unschedule('studio-weekly-notification-report');
  end if;
  perform cron.schedule(
    'studio-weekly-notification-report',
    '0 * * * *',
    $job$select public.studio_trigger_weekly_notification_report_worker();$job$
  );
end;
$schedule$;
