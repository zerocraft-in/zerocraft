-- Add an explicit publication state for portfolio projects.
-- Apply only through the approved migration workflow.

alter table public.works
  add column if not exists status text not null default 'draft'
  check (status in ('published', 'draft', 'archived'));

update public.works
set status = 'draft'
where status is null;

drop policy if exists "Public works read" on public.works;
drop policy if exists "Public works" on public.works;
drop policy if exists "Public works read published" on public.works;

create policy "Public works read published" on public.works
  for select
  using (status = 'published' or public.is_studio_member());
