-- Studio and Store are isolated Supabase projects, so Studio tables use
-- neutral names instead of product prefixes.
do $$
begin
  if to_regclass('public.studio_leads') is not null and to_regclass('public.leads') is null then alter table public.studio_leads rename to leads; end if;
  if to_regclass('public.studio_lead_activities') is not null and to_regclass('public.lead_activities') is null then alter table public.studio_lead_activities rename to lead_activities; end if;
  if to_regclass('public.studio_projects') is not null and to_regclass('public.projects') is null then alter table public.studio_projects rename to projects; end if;
  if to_regclass('public.studio_project_milestones') is not null and to_regclass('public.project_milestones') is null then alter table public.studio_project_milestones rename to project_milestones; end if;
  if to_regclass('public.studio_workspace_settings') is not null and to_regclass('public.workspace_settings') is null then alter table public.studio_workspace_settings rename to workspace_settings; end if;
  if to_regclass('public.studio_notification_preferences') is not null and to_regclass('public.notification_preferences') is null then alter table public.studio_notification_preferences rename to notification_preferences; end if;
  if to_regclass('public.studio_integrations') is not null and to_regclass('public.integrations') is null then alter table public.studio_integrations rename to integrations; end if;
end $$;
do $$
begin
  if to_regprocedure('public.studio_convert_lead_to_project(uuid)') is not null then
    alter function public.studio_convert_lead_to_project(uuid) rename to convert_lead_to_project;
  end if;
end $$;
notify pgrst, 'reload schema';
