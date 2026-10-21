-- Keep controlled test traffic out of operational health metrics without deleting history.

alter table public.studio_email_events
  add column if not exists is_test boolean not null default false;

alter table public.studio_automation_runs
  add column if not exists is_test boolean not null default false;

-- Backfill the controlled SMTP failure/test events created by the CMS test tools.
update public.studio_email_events
set is_test = true
where is_test = false
  and (
    kind = 'automation.failure.test'
    or recipient = 'invalid-test-recipient'
    or coalesce(metadata ->> 'test', 'false') = 'true'
  );

create index if not exists studio_email_events_health_idx
  on public.studio_email_events(is_test, status, created_at desc);

create index if not exists studio_automation_runs_health_idx
  on public.studio_automation_runs(is_test, status, created_at desc);

comment on column public.studio_email_events.is_test is 'True for controlled/test delivery events excluded from operational health metrics.';
comment on column public.studio_automation_runs.is_test is 'True for controlled/test automation runs excluded from operational health metrics.';
