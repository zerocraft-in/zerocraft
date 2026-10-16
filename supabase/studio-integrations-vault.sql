-- Server-only encrypted credentials for Studio integrations.
-- Apply this in the Supabase SQL editor for the same project used by the CMS.
create table if not exists public.studio_integrations (
  provider text primary key check (provider in ('gemini', 'supabase')),
  display_name text not null,
  status text not null default 'connected' check (status in ('connected', 'error')),
  encrypted_credentials text,
  enabled boolean not null default true,
  last_verified_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Keep existing installations compatible when the vault table predates controls.
alter table public.studio_integrations alter column encrypted_credentials drop not null;
alter table public.studio_integrations add column if not exists enabled boolean not null default true;

alter table public.studio_integrations enable row level security;
revoke all on public.studio_integrations from public, anon, authenticated;
grant all on public.studio_integrations to service_role;

comment on table public.studio_integrations is
  'Studio integration credentials encrypted with an application-held AES-256-GCM key; accessible only through server routes using service_role.';
