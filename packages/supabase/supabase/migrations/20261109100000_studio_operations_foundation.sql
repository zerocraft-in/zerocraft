-- Re-establish the Studio operations tables after the store-only migration and
-- make their access boundaries follow the existing permission system.
create table if not exists public.studio_leads (
  id uuid primary key default gen_random_uuid(),
  -- Optional CRM relation. The current schema does not guarantee a clients
  -- table, so the FK is added conditionally below.
  client_id uuid,
  name text not null check (length(trim(name)) between 1 and 160),
  email text not null,
  phone text not null default '',
  company text not null default '',
  stage text not null default 'new' check (stage in ('new','contacted','qualified','proposal','won','lost')),
  source text not null default 'manual',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  service_interest text not null default '',
  owner_id uuid references public.accounts(id) on delete set null,
  next_action text not null default '',
  next_action_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.studio_leads(id) on delete cascade,
  actor_id uuid references public.accounts(id) on delete set null,
  activity_type text not null default 'note' check (activity_type in ('note','email','whatsapp','call','appointment','stage_change')),
  detail text not null check (length(trim(detail)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table if not exists public.studio_projects (
  id uuid primary key default gen_random_uuid(),
  -- Optional CRM/CMS relations. These tables are not present in every
  -- deployment, so their FKs are added conditionally below.
  client_id uuid,
  work_id uuid,
  source_lead_id uuid references public.studio_leads(id) on delete set null,
  name text not null check (length(trim(name)) between 1 and 180),
  status text not null default 'planning' check (status in ('planning','active','review','completed','on_hold','cancelled')),
  description text not null default '',
  deadline date,
  budget numeric(12,2) check (budget is null or budget >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 180),
  status text not null default 'todo' check (status in ('todo','in_progress','blocked','done')),
  due_date date,
  position integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.studio_projects add column if not exists source_lead_id uuid references public.studio_leads(id) on delete set null;

-- Some deployments intentionally do not install the legacy clients/works
-- tables. Keep the UUID links when they exist, but never make this migration
-- fail just because those optional relations are absent.
do $$
begin
  if to_regclass('public.clients') is not null then
    if not exists (select 1 from pg_constraint where conname = 'studio_leads_client_id_fkey') then
      alter table public.studio_leads add constraint studio_leads_client_id_fkey
        foreign key (client_id) references public.clients(id) on delete set null;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'studio_projects_client_id_fkey') then
      alter table public.studio_projects add constraint studio_projects_client_id_fkey
        foreign key (client_id) references public.clients(id) on delete set null;
    end if;
  end if;
  if to_regclass('public.works') is not null
     and not exists (select 1 from pg_constraint where conname = 'studio_projects_work_id_fkey') then
    alter table public.studio_projects add constraint studio_projects_work_id_fkey
      foreign key (work_id) references public.works(id) on delete set null;
  end if;
end $$;

create unique index if not exists studio_projects_source_lead_unique on public.studio_projects(source_lead_id) where source_lead_id is not null;
create index if not exists studio_leads_stage_updated_idx on public.studio_leads(stage, updated_at desc);
create index if not exists studio_leads_owner_updated_idx on public.studio_leads(owner_id, updated_at desc);
create index if not exists studio_leads_follow_up_idx on public.studio_leads(next_action_at) where next_action_at is not null;
create index if not exists studio_lead_activities_lead_created_idx on public.studio_lead_activities(lead_id, created_at desc);
create index if not exists studio_projects_status_updated_idx on public.studio_projects(status, updated_at desc);

-- The simple-names migration renames the original studio_* RBAC tables to
-- permissions and role_permissions. Use the canonical names here so this
-- migration works on the current schema and on a fresh migration replay.
insert into public.permissions (key, label, description, group_name, sort_order) values
  ('dashboard.read', 'View dashboard', 'View Studio overview metrics.', 'Workspace', 10),
  ('content.read', 'View content', 'View Studio content.', 'Content', 20),
  ('content.manage', 'Manage content', 'Create, edit, publish, and delete content.', 'Content', 21),
  ('leads.read', 'View leads', 'View and search the Studio pipeline.', 'Operations', 25),
  ('leads.manage', 'Manage leads', 'Create, update, assign, and convert leads.', 'Operations', 26),
  ('projects.read', 'View projects', 'View Studio delivery projects.', 'Operations', 27),
  ('projects.manage', 'Manage projects', 'Create and update Studio delivery projects.', 'Operations', 28),
  ('media.read', 'View media', 'View the Studio media library.', 'Content', 29),
  ('media.manage', 'Manage media', 'Upload, edit, and delete Studio media.', 'Content', 30),
  ('analytics.read', 'View analytics', 'View Studio performance analytics.', 'Insights', 81),
  ('audit.read', 'View audit log', 'Review Studio security and operational events.', 'System', 110),
  ('audit.write', 'Write audit events', 'Record Studio operational events.', 'System', 111),
  ('settings.manage', 'Manage settings', 'Change Studio workspace settings.', 'System', 130),
  ('integrations.manage', 'Manage integrations', 'Connect and configure Studio integrations.', 'System', 131)
on conflict (key) do update set label = excluded.label, description = excluded.description, group_name = excluded.group_name, sort_order = excluded.sort_order;

insert into public.role_permissions (role, permission_key, allowed) values
  ('admin','dashboard.read',true),('admin','content.read',true),('admin','content.manage',true),('admin','leads.read',true),('admin','leads.manage',true),('admin','projects.read',true),('admin','projects.manage',true),('admin','media.read',true),('admin','media.manage',true),('admin','analytics.read',true),('admin','audit.read',true),('admin','audit.write',true),('admin','settings.manage',true),('admin','integrations.manage',true),
  ('manager','dashboard.read',true),('manager','content.read',true),('manager','content.manage',true),('manager','leads.read',true),('manager','leads.manage',true),('manager','projects.read',true),('manager','projects.manage',true),('manager','media.read',true),('manager','media.manage',true),('manager','analytics.read',true),('manager','audit.read',true),('manager','audit.write',true),('manager','settings.manage',true),('manager','integrations.manage',true),
  ('staff','dashboard.read',true),('staff','content.read',true),('staff','content.manage',true),('staff','leads.read',true),('staff','leads.manage',true),('staff','projects.read',true),('staff','media.read',true),('staff','analytics.read',true),('staff','audit.write',true)
on conflict (role, permission_key) do update set allowed = excluded.allowed, updated_at = now();

alter table public.studio_leads enable row level security;
alter table public.studio_lead_activities enable row level security;
alter table public.studio_projects enable row level security;
alter table public.studio_project_milestones enable row level security;

drop policy if exists "Studio read leads" on public.studio_leads;
drop policy if exists "Studio manage leads" on public.studio_leads;
drop policy if exists "Studio read lead activities" on public.studio_lead_activities;
drop policy if exists "Studio manage lead activities" on public.studio_lead_activities;
drop policy if exists "Studio read projects" on public.studio_projects;
drop policy if exists "Studio manage projects" on public.studio_projects;
drop policy if exists "Studio read project milestones" on public.studio_project_milestones;
drop policy if exists "Studio manage project milestones" on public.studio_project_milestones;
create policy "Studio read leads" on public.studio_leads for select to authenticated using (public.has_permission('leads.read') or public.has_permission('leads.manage'));
create policy "Studio manage leads" on public.studio_leads for all to authenticated using (public.has_permission('leads.manage')) with check (public.has_permission('leads.manage'));
create policy "Studio read lead activities" on public.studio_lead_activities for select to authenticated using (public.has_permission('leads.read') or public.has_permission('leads.manage'));
create policy "Studio manage lead activities" on public.studio_lead_activities for insert to authenticated with check (public.has_permission('leads.manage') and actor_id = (select auth.uid()));
create policy "Studio read projects" on public.studio_projects for select to authenticated using (public.has_permission('projects.read') or public.has_permission('projects.manage'));
create policy "Studio manage projects" on public.studio_projects for all to authenticated using (public.has_permission('projects.manage')) with check (public.has_permission('projects.manage'));
create policy "Studio read project milestones" on public.studio_project_milestones for select to authenticated using (public.has_permission('projects.read') or public.has_permission('projects.manage'));
create policy "Studio manage project milestones" on public.studio_project_milestones for all to authenticated using (public.has_permission('projects.manage')) with check (public.has_permission('projects.manage'));
grant select, insert, update, delete on public.studio_leads, public.studio_lead_activities, public.studio_projects, public.studio_project_milestones to authenticated;

create or replace function public.studio_convert_lead_to_project(p_lead_id uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare lead_row public.studio_leads%rowtype; project_id uuid;
begin
  if not public.has_permission('leads.manage') or not public.has_permission('projects.manage') then raise exception using errcode='42501', message='Lead conversion permissions required.'; end if;
  select * into lead_row from public.studio_leads where id = p_lead_id for update;
  if not found then raise exception using errcode='P0002', message='Lead not found.'; end if;
  select id into project_id from public.studio_projects where source_lead_id = p_lead_id;
  if project_id is not null then return project_id; end if;
  insert into public.studio_projects(client_id, source_lead_id, name, description, status)
    values(lead_row.client_id, lead_row.id, lead_row.name, lead_row.notes, 'planning') returning id into project_id;
  update public.studio_leads set stage='won', updated_at=now() where id=p_lead_id;
  insert into public.studio_lead_activities(lead_id, actor_id, activity_type, detail)
    values(p_lead_id, auth.uid(), 'stage_change', 'Converted to project ' || project_id::text);
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values(auth.uid(), 'lead.converted_to_project', 'studio_lead', p_lead_id, jsonb_build_object('project_id', project_id));
  return project_id;
end; $$;
revoke all on function public.studio_convert_lead_to_project(uuid) from public, anon;
grant execute on function public.studio_convert_lead_to_project(uuid) to authenticated;

notify pgrst, 'reload schema';
