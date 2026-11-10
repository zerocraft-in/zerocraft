-- Studio Projects v2: owner assignment, progress tracking, and safe project
-- detail/milestone editing for the live Studio workspace.
alter table public.studio_projects
  add column if not exists owner_id uuid,
  add column if not exists progress integer not null default 0;

do $$
begin
  if to_regclass('public.accounts') is not null
     and not exists (select 1 from pg_constraint where conname = 'studio_projects_owner_id_fkey') then
    alter table public.studio_projects add constraint studio_projects_owner_id_fkey
      foreign key (owner_id) references public.accounts(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'studio_projects_progress_check') then
    alter table public.studio_projects add constraint studio_projects_progress_check
      check (progress between 0 and 100);
  end if;
end $$;

create index if not exists studio_projects_owner_updated_idx
  on public.studio_projects(owner_id, updated_at desc);

alter table public.studio_projects enable row level security;
drop policy if exists "Studio read projects" on public.studio_projects;
drop policy if exists "Studio manage projects" on public.studio_projects;
create policy "Studio read projects" on public.studio_projects
  for select to authenticated
  using (public.has_permission('projects.read') or public.has_permission('projects.manage'));
create policy "Studio manage projects" on public.studio_projects
  for all to authenticated
  using (public.has_permission('projects.manage'))
  with check (public.has_permission('projects.manage'));

notify pgrst, 'reload schema';
