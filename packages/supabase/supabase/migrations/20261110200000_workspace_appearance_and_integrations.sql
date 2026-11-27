alter table public.workspace_settings
  add column if not exists logo_url text not null default '',
  add column if not exists favicon_url text not null default '',
  add column if not exists font_family text not null default 'Inter',
  add column if not exists theme_mode text not null default 'dark';

alter table public.workspace_settings
  drop constraint if exists workspace_settings_theme_mode_check,
  add constraint workspace_settings_theme_mode_check check (theme_mode in ('dark', 'light', 'system'));

insert into public.integrations (provider, display_name, status, enabled, metadata)
values
  ('cloudflare_r2', 'Cloudflare R2 media', 'connected', true, '{"kind":"storage","managed_by":"server_environment"}'::jsonb),
  ('google_workspace', 'Google Workspace', 'error', false, '{"kind":"oauth","provider":"google"}'::jsonb),
  ('gmail', 'Gmail', 'error', false, '{"kind":"oauth","provider":"google"}'::jsonb),
  ('ga4', 'Google Analytics', 'error', false, '{"kind":"oauth","provider":"google"}'::jsonb),
  ('search_console', 'Google Search Console', 'error', false, '{"kind":"oauth","provider":"google"}'::jsonb),
  ('instagram', 'Instagram', 'error', false, '{"kind":"oauth","provider":"meta"}'::jsonb),
  ('google_business', 'Google Business Profile', 'error', false, '{"kind":"oauth","provider":"google"}'::jsonb)
on conflict (provider) do update set display_name = excluded.display_name, metadata = excluded.metadata;

alter table public.integrations add column if not exists credentials_encrypted text;
drop policy if exists "Managers manage integrations" on public.integrations;
create policy "Managers manage integrations" on public.integrations for update to authenticated
  using (public.has_permission('integrations.manage'))
  with check (public.has_permission('integrations.manage'));
grant update on public.integrations to authenticated;

create or replace function public.save_oauth_integration(
  p_provider text,
  p_credentials text,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('integrations.manage') then
    raise exception using errcode = '42501', message = 'Integration management permission required.';
  end if;

  update public.integrations
     set status = 'connected',
         enabled = true,
         last_verified_at = now(),
         credentials_encrypted = p_credentials,
         metadata = coalesce(p_metadata, '{}'::jsonb),
         updated_by = (select auth.uid()),
         updated_at = now()
   where provider = p_provider;

  if not found then
    raise exception using errcode = 'P0002', message = 'Integration provider is not registered.';
  end if;
  return true;
end;
$$;

revoke all on function public.save_oauth_integration(text, text, jsonb) from public, anon;
grant execute on function public.save_oauth_integration(text, text, jsonb) to authenticated;

create or replace function public.mark_integration_verified(p_provider text, p_metadata jsonb default '{}'::jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('integrations.manage') then
    raise exception using errcode = '42501', message = 'Integration management permission required.';
  end if;
  update public.integrations
     set status = 'connected', enabled = true, last_verified_at = now(),
         metadata = coalesce(metadata, '{}'::jsonb) || coalesce(p_metadata, '{}'::jsonb),
         updated_by = (select auth.uid()), updated_at = now()
   where provider = p_provider;
  if not found then raise exception using errcode = 'P0002', message = 'Integration provider is not registered.'; end if;
  return true;
end;
$$;

create or replace function public.disconnect_integration(p_provider text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('integrations.manage') then
    raise exception using errcode = '42501', message = 'Integration management permission required.';
  end if;
  update public.integrations
     set status = 'error', enabled = false, credentials_encrypted = null,
         last_verified_at = null, updated_by = (select auth.uid()), updated_at = now()
   where provider = p_provider;
  if not found then raise exception using errcode = 'P0002', message = 'Integration provider is not registered.'; end if;
  return true;
end;
$$;

revoke all on function public.mark_integration_verified(text, jsonb) from public, anon;
revoke all on function public.disconnect_integration(text) from public, anon;
grant execute on function public.mark_integration_verified(text, jsonb) to authenticated;
grant execute on function public.disconnect_integration(text) to authenticated;

notify pgrst, 'reload schema';
