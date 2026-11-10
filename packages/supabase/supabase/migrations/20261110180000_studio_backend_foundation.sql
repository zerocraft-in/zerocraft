-- Complete Studio backend for the dedicated Studio Supabase project.
-- The Store is a separate project, so these tables intentionally use neutral
-- names rather than studio_/store_ prefixes.

create table if not exists public.permissions (
  key text primary key,
  label text not null,
  description text not null default '',
  group_name text not null default 'Workspace',
  sort_order integer not null default 0
);

create table if not exists public.role_permissions (
  role text not null,
  permission_key text not null references public.permissions(key) on delete cascade,
  allowed boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (role, permission_key)
);

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.store_members m where m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('owner','admin','manager','staff'));
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.store_members m where m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('owner','admin'));
$$;

create or replace function public.has_permission(p_permission text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.store_members m
    join public.role_permissions rp on rp.role = m.role and rp.permission_key = p_permission and rp.allowed
    where m.user_id = (select auth.uid()) and m.status = 'active'
  );
$$;

revoke all on function public.is_member() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.has_permission(text) from public, anon;
grant execute on function public.is_member() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_permission(text) to authenticated;

insert into public.permissions(key,label,description,group_name,sort_order) values
 ('dashboard.read','View dashboard','View Studio overview metrics.','Workspace',10),
 ('content.read','View content','View and publish website content.','Content',20),
 ('content.manage','Manage content','Create, edit, and publish website content.','Content',21),
 ('leads.read','View leads','View the inquiry pipeline.','Operations',30),
 ('leads.manage','Manage leads','Create and update inquiries.','Operations',31),
 ('projects.read','View projects','View delivery projects.','Operations',40),
 ('projects.manage','Manage projects','Create and update delivery projects.','Operations',41),
 ('media.read','View media','View the media library.','Content',50),
 ('media.manage','Manage media','Manage media assets.','Content',51),
 ('analytics.read','View analytics','View site analytics.','Insights',60),
 ('audit.read','View audit log','Review operational events.','System',70),
 ('audit.write','Write audit events','Record operational events.','System',71),
 ('settings.manage','Manage settings','Manage workspace settings.','System',80),
 ('integrations.manage','Manage integrations','Manage integration status.','System',81)
 ,('team.manage','Manage team','Manage workspace members.','System',82)
on conflict (key) do update set label=excluded.label,description=excluded.description,group_name=excluded.group_name,sort_order=excluded.sort_order;

insert into public.role_permissions(role,permission_key,allowed)
select role_name, p.key, true from (values ('owner'),('admin'),('manager'),('staff')) roles(role_name) cross join public.permissions p
on conflict (role,permission_key) do update set allowed=true,updated_at=now();

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique,
  excerpt text not null default '', content text not null default '', content_type text not null default 'page',
  content_metadata jsonb not null default '{}'::jsonb, status text not null default 'draft',
  workflow_status text not null default 'draft', workflow_note text not null default '',
  seo_title text not null default '', seo_description text not null default '', featured_image_url text not null default '',
  author_id uuid references public.accounts(id) on delete set null, approved_by uuid references public.accounts(id) on delete set null,
  approved_at timestamptz, published_at timestamptz, scheduled_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(), page_id uuid not null references public.pages(id) on delete cascade,
  version integer not null, snapshot jsonb not null default '{}'::jsonb, created_by uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now(), unique(page_id,version)
);
create table if not exists public.content_workflow_events (
  id uuid primary key default gen_random_uuid(), page_id uuid not null references public.pages(id) on delete cascade,
  from_status text, to_status text not null, note text not null default '', actor_id uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.content_blocks (
  id uuid primary key default gen_random_uuid(), page_id uuid not null references public.pages(id) on delete cascade,
  position integer not null default 0, block_type text not null, data jsonb not null default '{}'::jsonb,
  created_by uuid references public.accounts(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(), name text not null, email text not null, phone text not null default '', company text not null default '',
  stage text not null default 'new', source text not null default 'manual', utm_source text, utm_medium text, utm_campaign text,
  service_interest text not null default '', owner_id uuid references public.accounts(id) on delete set null, next_action text not null default '',
  next_action_at timestamptz, notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(), lead_id uuid not null references public.leads(id) on delete cascade,
  actor_id uuid references public.accounts(id) on delete set null, activity_type text not null default 'note', detail text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(), name text not null, status text not null default 'planning', description text not null default '',
  deadline date, budget numeric(12,2), progress integer not null default 0, owner_id uuid references public.accounts(id) on delete set null,
  source_lead_id uuid references public.leads(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  title text not null, status text not null default 'todo', due_date date, position integer not null default 0, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.workspace_settings (
  id smallint primary key default 1 check(id=1), workspace_name text not null default 'Zerocraft Studio', currency text not null default 'INR',
  timezone text not null default 'Asia/Kolkata', brand_name text not null default 'Zerocraft Studio', accent_color text not null default '#ff6a2b',
  updated_by uuid references public.accounts(id) on delete set null, updated_at timestamptz not null default now()
);
insert into public.workspace_settings(id) values(1) on conflict(id) do nothing;
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.accounts(id) on delete cascade, lead_assigned_enabled boolean not null default true,
  approval_needed_enabled boolean not null default true, weekly_digest_enabled boolean not null default false, updated_at timestamptz not null default now()
);
create table if not exists public.integrations (
  provider text primary key, display_name text not null, status text not null default 'error', enabled boolean not null default false,
  last_verified_at timestamptz, updated_by uuid references public.accounts(id) on delete set null, updated_at timestamptz not null default now(),
  last_error text, metadata jsonb not null default '{}'::jsonb
);
create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(), email text not null, role text not null default 'staff',
  invited_by uuid references public.accounts(id) on delete set null, status text not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'), created_at timestamptz not null default now(),
  accepted_at timestamptz, revoked_at timestamptz
);
create table if not exists public.files (
  storage_path text primary key, public_url text not null default '', file_name text not null, folder text not null default 'general',
  alt_text text not null default '', mime_type text not null default 'application/octet-stream', size_bytes bigint not null default 0,
  created_by uuid references public.accounts(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create or replace function public.studio_integration_statuses()
returns table(provider text,display_name text,status text,enabled boolean,last_verified_at timestamptz)
language sql stable security definer set search_path=public as $$
  select i.provider,i.display_name,i.status,i.enabled,i.last_verified_at
  from public.integrations i where public.has_permission('integrations.manage') order by i.display_name;
$$;
revoke all on function public.studio_integration_statuses() from public,anon;
grant execute on function public.studio_integration_statuses() to authenticated;

alter table public.pages enable row level security;
alter table public.content_versions enable row level security;
alter table public.content_workflow_events enable row level security;
alter table public.content_blocks enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;
alter table public.projects enable row level security;
alter table public.project_milestones enable row level security;
alter table public.workspace_settings enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.integrations enable row level security;
alter table public.staff_invites enable row level security;
alter table public.files enable row level security;

drop policy if exists "Published pages are public" on public.pages;
drop policy if exists "Members manage pages" on public.pages;
drop policy if exists "Members read content versions" on public.content_versions;
drop policy if exists "Members manage content versions" on public.content_versions;
drop policy if exists "Members read workflow events" on public.content_workflow_events;
drop policy if exists "Members write workflow events" on public.content_workflow_events;
drop policy if exists "Members read content blocks" on public.content_blocks;
drop policy if exists "Members manage content blocks" on public.content_blocks;
drop policy if exists "Members read leads" on public.leads;
drop policy if exists "Members manage leads" on public.leads;
drop policy if exists "Members read lead activities" on public.lead_activities;
drop policy if exists "Members write lead activities" on public.lead_activities;
drop policy if exists "Members read projects" on public.projects;
drop policy if exists "Members manage projects" on public.projects;
drop policy if exists "Members read milestones" on public.project_milestones;
drop policy if exists "Members manage milestones" on public.project_milestones;
drop policy if exists "Members read settings" on public.workspace_settings;
drop policy if exists "Managers manage settings" on public.workspace_settings;
drop policy if exists "Members read own notification preferences" on public.notification_preferences;
drop policy if exists "Users manage own notification preferences" on public.notification_preferences;
drop policy if exists "Members read files" on public.files;
drop policy if exists "Managers manage files" on public.files;
drop policy if exists "Managers read invites" on public.staff_invites;
drop policy if exists "Managers manage invites" on public.staff_invites;

create policy "Published pages are public" on public.pages for select to public using(status='published');
create policy "Members manage pages" on public.pages for all to authenticated using(public.has_permission('content.manage')) with check(public.has_permission('content.manage'));
create policy "Members read content versions" on public.content_versions for select to authenticated using(public.has_permission('content.read') or public.has_permission('content.manage'));
create policy "Members manage content versions" on public.content_versions for all to authenticated using(public.has_permission('content.manage')) with check(public.has_permission('content.manage'));
create policy "Members read workflow events" on public.content_workflow_events for select to authenticated using(public.has_permission('content.read') or public.has_permission('content.manage'));
create policy "Members write workflow events" on public.content_workflow_events for insert to authenticated with check(public.has_permission('content.manage') and actor_id=(select auth.uid()));
create policy "Members read content blocks" on public.content_blocks for select to authenticated using(public.has_permission('content.read') or public.has_permission('content.manage'));
create policy "Members manage content blocks" on public.content_blocks for all to authenticated using(public.has_permission('content.manage')) with check(public.has_permission('content.manage'));
create policy "Members read leads" on public.leads for select to authenticated using(public.has_permission('leads.read') or public.has_permission('leads.manage'));
create policy "Members manage leads" on public.leads for all to authenticated using(public.has_permission('leads.manage')) with check(public.has_permission('leads.manage'));
create policy "Members read lead activities" on public.lead_activities for select to authenticated using(public.has_permission('leads.read') or public.has_permission('leads.manage'));
create policy "Members write lead activities" on public.lead_activities for insert to authenticated with check(public.has_permission('leads.manage') and actor_id=(select auth.uid()));
create policy "Members read projects" on public.projects for select to authenticated using(public.has_permission('projects.read') or public.has_permission('projects.manage'));
create policy "Members manage projects" on public.projects for all to authenticated using(public.has_permission('projects.manage')) with check(public.has_permission('projects.manage'));
create policy "Members read milestones" on public.project_milestones for select to authenticated using(public.has_permission('projects.read') or public.has_permission('projects.manage'));
create policy "Members manage milestones" on public.project_milestones for all to authenticated using(public.has_permission('projects.manage')) with check(public.has_permission('projects.manage'));
create policy "Members read settings" on public.workspace_settings for select to authenticated using(public.is_member());
create policy "Managers manage settings" on public.workspace_settings for all to authenticated using(public.has_permission('settings.manage')) with check(public.has_permission('settings.manage'));
create policy "Members read own notification preferences" on public.notification_preferences for select to authenticated using(user_id=(select auth.uid()));
create policy "Users manage own notification preferences" on public.notification_preferences for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "Members read files" on public.files for select to authenticated using(public.has_permission('media.read') or public.has_permission('media.manage'));
create policy "Managers manage files" on public.files for all to authenticated using(public.has_permission('media.manage')) with check(public.has_permission('media.manage'));
create policy "Managers read invites" on public.staff_invites for select to authenticated using(public.has_permission('team.manage'));
create policy "Managers manage invites" on public.staff_invites for all to authenticated using(public.has_permission('team.manage')) with check(public.has_permission('team.manage'));
revoke all on public.integrations from public, anon, authenticated;
grant select,insert,update,delete on public.permissions,public.role_permissions,public.pages,public.content_versions,public.content_workflow_events,public.content_blocks,public.leads,public.lead_activities,public.projects,public.project_milestones,public.workspace_settings,public.notification_preferences,public.staff_invites,public.files to authenticated;
notify pgrst, 'reload schema';
