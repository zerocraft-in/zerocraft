-- Bring legacy Studio project tables up to the fields used by the project editor.
-- This is intentionally idempotent for deployments where the v2 migration ran.
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
end $$;

alter table public.studio_projects
  drop constraint if exists studio_projects_progress_check;

alter table public.studio_projects
  add constraint studio_projects_progress_check check (progress between 0 and 100);

create index if not exists studio_projects_owner_updated_idx
  on public.studio_projects(owner_id, updated_at desc);

notify pgrst, 'reload schema';
