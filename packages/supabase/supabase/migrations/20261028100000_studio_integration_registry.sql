-- Expand the Studio integration vault into a provider registry.
-- Credentials remain server-only and encrypted; this migration only stores safe status metadata.
create table if not exists public.studio_integrations (
  provider text primary key,
  display_name text not null,
  status text not null default 'error' check (status in ('connected', 'error')),
  encrypted_credentials text,
  enabled boolean not null default false,
  last_verified_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table if exists public.studio_integrations
  drop constraint if exists studio_integrations_provider_check;

alter table if exists public.studio_integrations
  add constraint studio_integrations_provider_check check (
    provider in (
      'gemini', 'supabase', 'gmail', 'whatsapp', 'ga4',
      'search_console', 'instagram', 'google_business'
    )
  );

alter table if exists public.studio_integrations
  add column if not exists last_error text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table if exists public.studio_integrations enable row level security;
revoke all on public.studio_integrations from public, anon, authenticated;
grant all on public.studio_integrations to service_role;

insert into public.studio_integrations (provider, display_name, status, enabled)
values
  ('gmail', 'Gmail workspace', 'error', false),
  ('whatsapp', 'WhatsApp Business', 'error', false),
  ('ga4', 'Google Analytics', 'error', false),
  ('search_console', 'Google Search Console', 'error', false),
  ('instagram', 'Instagram', 'error', false),
  ('google_business', 'Google Business Profile', 'error', false)
on conflict (provider) do nothing;

comment on column public.studio_integrations.metadata is
  'Non-secret provider metadata such as account label, property id, or verification state.';
