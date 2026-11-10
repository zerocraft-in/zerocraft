-- CMS v2: revisions, workflow approvals, scheduling, and structured blocks.
alter table public.pages
  add column if not exists scheduled_at timestamptz,
  add column if not exists workflow_status text not null default 'draft',
  add column if not exists workflow_note text not null default '',
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cms_pages_workflow_status_check') then
    alter table public.pages add constraint cms_pages_workflow_status_check
      check (workflow_status in ('draft','pending_review','approved','rejected','scheduled'));
  end if;
end $$;

create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(snapshot) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (page_id, version)
);

create table if not exists public.content_workflow_events (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text not null default '',
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.content_blocks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  position integer not null default 0,
  block_type text not null check (block_type in ('paragraph','heading','image','gallery','quote','code','cta','video','embed')),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_versions_page_idx on public.content_versions(page_id, version desc);
create index if not exists content_workflow_events_page_idx on public.content_workflow_events(page_id, created_at desc);
create index if not exists content_blocks_page_position_idx on public.content_blocks(page_id, position);
create index if not exists cms_pages_scheduled_idx on public.pages(scheduled_at) where scheduled_at is not null;

alter table public.content_versions enable row level security;
alter table public.content_workflow_events enable row level security;
alter table public.content_blocks enable row level security;
drop policy if exists "Studio read content versions" on public.content_versions;
drop policy if exists "Studio manage content versions" on public.content_versions;
drop policy if exists "Studio read workflow events" on public.content_workflow_events;
drop policy if exists "Studio manage workflow events" on public.content_workflow_events;
drop policy if exists "Studio read content blocks" on public.content_blocks;
drop policy if exists "Studio manage content blocks" on public.content_blocks;
create policy "Studio read content versions" on public.content_versions for select to authenticated using (public.has_permission('content.read') or public.has_permission('content.manage'));
create policy "Studio manage content versions" on public.content_versions for all to authenticated using (public.has_permission('content.manage')) with check (public.has_permission('content.manage'));
create policy "Studio read workflow events" on public.content_workflow_events for select to authenticated using (public.has_permission('content.read') or public.has_permission('content.manage'));
create policy "Studio manage workflow events" on public.content_workflow_events for insert to authenticated with check (public.has_permission('content.manage') and actor_id = (select auth.uid()));
create policy "Studio read content blocks" on public.content_blocks for select to authenticated using (public.has_permission('content.read') or public.has_permission('content.manage'));
create policy "Studio manage content blocks" on public.content_blocks for all to authenticated using (public.has_permission('content.manage')) with check (public.has_permission('content.manage'));
grant select, insert, update, delete on public.content_versions, public.content_workflow_events, public.content_blocks to authenticated;

create or replace function public.publish_due_pages()
returns integer language plpgsql security definer set search_path = public as $$
declare changed integer;
begin
  update public.pages
  set status = 'published', published_at = coalesce(published_at, now()), scheduled_at = null, workflow_status = 'approved', updated_at = now()
  where status = 'draft' and workflow_status in ('approved','scheduled') and scheduled_at is not null and scheduled_at <= now();
  get diagnostics changed = row_count;
  return changed;
end; $$;
revoke all on function public.publish_due_pages() from public, anon, authenticated;
grant execute on function public.publish_due_pages() to service_role;

-- Supabase projects include pg_cron. Keep one idempotent worker that turns
-- approved scheduled drafts into published pages every minute.
create extension if not exists pg_cron with schema extensions;
do $$
declare existing_job_id bigint;
begin
  select jobid into existing_job_id from cron.job where jobname = 'studio-publish-due-pages';
  if existing_job_id is not null then perform cron.unschedule(existing_job_id); end if;
  perform cron.schedule('studio-publish-due-pages', '* * * * *', 'select public.publish_due_pages();');
end $$;

notify pgrst, 'reload schema';
