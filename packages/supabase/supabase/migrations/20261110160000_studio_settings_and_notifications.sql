create table if not exists public.studio_workspace_settings (
  id smallint primary key default 1 check (id = 1),
  workspace_name text not null default 'ZeroCraft Studio',
  currency text not null default 'USD',
  timezone text not null default 'Asia/Kolkata',
  brand_name text not null default 'ZeroCraft Studio',
  accent_color text not null default '#ff6a2b',
  updated_by uuid references public.accounts(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.studio_workspace_settings
  drop constraint if exists studio_workspace_settings_currency_check,
  drop constraint if exists studio_workspace_settings_accent_color_check;
alter table public.studio_workspace_settings
  add constraint studio_workspace_settings_currency_check
    check (
      char_length(currency) = 3
      and translate(currency, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '') = ''
    ),
  add constraint studio_workspace_settings_accent_color_check
    check (
      char_length(accent_color) = 7
      and left(accent_color, 1) = '#'
      and translate(substr(accent_color, 2), '0123456789ABCDEFabcdef', '') = ''
    );

insert into public.studio_workspace_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.studio_workspace_settings enable row level security;
drop policy if exists "Studio members read workspace settings" on public.studio_workspace_settings;
create policy "Studio members read workspace settings"
  on public.studio_workspace_settings for select to authenticated
  using (public.is_member());
drop policy if exists "Authorized members manage workspace settings" on public.studio_workspace_settings;
create policy "Authorized members manage workspace settings"
  on public.studio_workspace_settings for all to authenticated
  using (public.has_permission('settings.manage'))
  with check (public.has_permission('settings.manage'));
grant select, insert, update on public.studio_workspace_settings to authenticated;

create table if not exists public.studio_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  automation_failure_enabled boolean not null default true,
  low_stock_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.studio_notification_preferences
  add column if not exists lead_assigned_enabled boolean not null default true,
  add column if not exists approval_needed_enabled boolean not null default true,
  add column if not exists weekly_digest_enabled boolean not null default false;

alter table public.studio_notification_preferences enable row level security;
drop policy if exists "Studio read notification preferences" on public.studio_notification_preferences;
create policy "Studio read notification preferences"
  on public.studio_notification_preferences for select to authenticated
  using (public.is_member());
drop policy if exists "Users manage own notification preferences" on public.studio_notification_preferences;
create policy "Users manage own notification preferences"
  on public.studio_notification_preferences for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update on public.studio_notification_preferences to authenticated;

create table if not exists public.studio_integrations (
  provider text primary key check (
    provider in ('gemini', 'supabase', 'gmail', 'whatsapp', 'ga4', 'search_console', 'instagram', 'google_business')
  ),
  display_name text not null,
  status text not null default 'error' check (status in ('connected', 'error')),
  encrypted_credentials text,
  enabled boolean not null default false,
  last_verified_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  last_error text,
  metadata jsonb not null default '{}'::jsonb
);
insert into public.studio_integrations (provider, display_name, status, enabled)
values
  ('gmail', 'Gmail workspace', 'error', false),
  ('whatsapp', 'WhatsApp Business', 'error', false),
  ('ga4', 'Google Analytics', 'error', false),
  ('search_console', 'Google Search Console', 'error', false),
  ('instagram', 'Instagram', 'error', false),
  ('google_business', 'Google Business Profile', 'error', false)
on conflict (provider) do nothing;
alter table public.studio_integrations enable row level security;
revoke all on public.studio_integrations from public, anon, authenticated;
grant all on public.studio_integrations to service_role;

create or replace function public.studio_integration_statuses()
returns table (
  provider text,
  display_name text,
  status text,
  enabled boolean,
  last_verified_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select integration.provider,
         integration.display_name,
         integration.status,
         integration.enabled,
         integration.last_verified_at
  from public.studio_integrations as integration
  where public.has_permission('integrations.manage')
  order by integration.display_name;
$$;

revoke all on function public.studio_integration_statuses() from public, anon;
grant execute on function public.studio_integration_statuses() to authenticated;
