-- Extend legacy pages installations without changing existing content.
alter table public.pages
  add column if not exists content_type text not null default 'page',
  add column if not exists content_metadata jsonb not null default '{}'::jsonb,
  add column if not exists scheduled_at timestamptz,
  add column if not exists workflow_status text not null default 'draft',
  add column if not exists workflow_note text not null default '',
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cms_pages_content_type_check') then
    alter table public.pages add constraint cms_pages_content_type_check
      check (content_type in ('page','blog','testimonial','case_study','announcement'));
  end if;
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

create index if not exists cms_pages_content_type_updated_idx on public.pages(content_type, updated_at desc);
create index if not exists cms_pages_scheduled_idx on public.pages(scheduled_at) where scheduled_at is not null;
create index if not exists content_versions_page_idx on public.content_versions(page_id, version desc);
create index if not exists content_workflow_events_page_idx on public.content_workflow_events(page_id, created_at desc);
create index if not exists content_blocks_page_position_idx on public.content_blocks(page_id, position);

alter table public.content_versions enable row level security;
alter table public.content_workflow_events enable row level security;
alter table public.content_blocks enable row level security;

drop policy if exists "Studio read content versions" on public.content_versions;
drop policy if exists "Studio manage content versions" on public.content_versions;
drop policy if exists "Studio read workflow events" on public.content_workflow_events;
drop policy if exists "Studio manage workflow events" on public.content_workflow_events;
drop policy if exists "Studio read content blocks" on public.content_blocks;
drop policy if exists "Studio manage content blocks" on public.content_blocks;

create policy "Studio read content versions" on public.content_versions for select to authenticated
  using (public.has_permission('content.read') or public.has_permission('content.manage'));
create policy "Studio manage content versions" on public.content_versions for all to authenticated
  using (public.has_permission('content.manage')) with check (public.has_permission('content.manage'));
create policy "Studio read workflow events" on public.content_workflow_events for select to authenticated
  using (public.has_permission('content.read') or public.has_permission('content.manage'));
create policy "Studio manage workflow events" on public.content_workflow_events for insert to authenticated
  with check (public.has_permission('content.manage') and actor_id = (select auth.uid()));
create policy "Studio read content blocks" on public.content_blocks for select to authenticated
  using (public.has_permission('content.read') or public.has_permission('content.manage'));
create policy "Studio manage content blocks" on public.content_blocks for all to authenticated
  using (public.has_permission('content.manage')) with check (public.has_permission('content.manage'));

grant select, insert, update, delete on public.content_versions, public.content_workflow_events, public.content_blocks to authenticated;

notify pgrst, 'reload schema';
