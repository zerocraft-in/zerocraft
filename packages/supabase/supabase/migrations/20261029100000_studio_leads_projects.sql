-- Studio OS lead pipeline and project delivery foundation.
create table if not exists public.studio_leads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
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
  owner_id uuid references public.profiles(id) on delete set null,
  next_action text not null default '',
  next_action_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_leads_stage_idx on public.studio_leads(stage, updated_at desc);
create index if not exists studio_leads_source_idx on public.studio_leads(source, created_at desc);

create table if not exists public.studio_lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.studio_leads(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  activity_type text not null default 'note' check (activity_type in ('note','email','whatsapp','call','appointment','stage_change')),
  detail text not null,
  created_at timestamptz not null default now()
);

create index if not exists studio_lead_activities_lead_idx on public.studio_lead_activities(lead_id, created_at desc);

create table if not exists public.studio_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  work_id uuid references public.works(id) on delete set null,
  name text not null check (length(trim(name)) between 1 and 180),
  status text not null default 'planning' check (status in ('planning','active','review','completed','on_hold','cancelled')),
  description text not null default '',
  deadline date,
  budget numeric(12,2) check (budget is null or budget >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_projects_status_idx on public.studio_projects(status, updated_at desc);

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

create index if not exists studio_project_milestones_project_idx on public.studio_project_milestones(project_id, position);

alter table public.studio_leads enable row level security;
alter table public.studio_lead_activities enable row level security;
alter table public.studio_projects enable row level security;
alter table public.studio_project_milestones enable row level security;

drop policy if exists "Studio read leads" on public.studio_leads;
drop policy if exists "Studio manage leads" on public.studio_leads;
create policy "Studio read leads" on public.studio_leads for select to authenticated using (public.is_studio_member());
create policy "Studio manage leads" on public.studio_leads for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());

drop policy if exists "Studio read lead activities" on public.studio_lead_activities;
drop policy if exists "Studio manage lead activities" on public.studio_lead_activities;
create policy "Studio read lead activities" on public.studio_lead_activities for select to authenticated using (public.is_studio_member());
create policy "Studio manage lead activities" on public.studio_lead_activities for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());

drop policy if exists "Studio read projects" on public.studio_projects;
drop policy if exists "Studio manage projects" on public.studio_projects;
create policy "Studio read projects" on public.studio_projects for select to authenticated using (public.is_studio_member());
create policy "Studio manage projects" on public.studio_projects for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());

drop policy if exists "Studio read project milestones" on public.studio_project_milestones;
drop policy if exists "Studio manage project milestones" on public.studio_project_milestones;
create policy "Studio read project milestones" on public.studio_project_milestones for select to authenticated using (public.is_studio_member());
create policy "Studio manage project milestones" on public.studio_project_milestones for all to authenticated using (public.is_studio_member()) with check (public.is_studio_member());

grant select, insert, update, delete on public.studio_leads, public.studio_lead_activities, public.studio_projects, public.studio_project_milestones to authenticated;
