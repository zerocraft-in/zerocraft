-- Workspace feature flags control which CMS modules are visible and usable.
create table if not exists public.studio_features (
  feature_key text primary key,
  display_name text not null,
  description text not null default '',
  enabled boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.studio_features enable row level security;
revoke all on public.studio_features from public, anon, authenticated;
grant all on public.studio_features to service_role;

insert into public.studio_features (feature_key, display_name, description, enabled)
values
  ('crm', 'Clients & leads', 'Lead pipeline, client records and appointments.', true),
  ('content', 'Content studio', 'Works, projects, journal and media publishing.', true),
  ('commerce', 'Commerce', 'Store, catalogue, inventory and orders.', true),
  ('email', 'Email workspace', 'Inbox, drafts and studio email delivery.', true),
  ('automation', 'Automation hub', 'Triggers, webhooks, retries and notifications.', true),
  ('analytics', 'Growth & analytics', 'GA4, Search Console and attribution reporting.', false)
on conflict (feature_key) do update set
  display_name = excluded.display_name,
  description = excluded.description;
